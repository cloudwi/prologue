package com.prologue.backend.growth

import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** Committed mail rows form a durable source. Also catches two simultaneous first letters. */
@Component
class GrowthConnectionProjector(
    private val jdbc: JdbcTemplate,
    private val events: JdbcGrowthEvents,
    @param:Value("\${review.email:}") private val reviewEmail: String = "",
) {
    data class PairFact(val sender: UUID, val recipient: UUID, val source: String, val at: Instant)

    @Scheduled(fixedDelayString = "\${growth.projection-delay-ms:60000}", initialDelayString = "\${growth.projection-delay-ms:60000}")
    @Transactional
    fun project(): Int {
        val pairs = jdbc.query(
            """with candidates as (
                 select m.sender_account_id, m.recipient_account_id, m.created_at,
                   'pair:' || least(m.id::text, r.id::text) || ':' || greatest(m.id::text, r.id::text) as source
                 from mails m join mails r on r.sender_account_id = m.recipient_account_id
                   and r.recipient_account_id = m.sender_account_id
                 join accounts a on a.id = m.sender_account_id
                 join accounts b on b.id = m.recipient_account_id
                 where (m.created_at, m.id) > (r.created_at, r.id)
                   and m.created_at >= (select started_at from growth_collection where id = 1)
                   and m.created_at >= now() - interval '180 days'
                   and a.status = 'ACTIVE' and b.status = 'ACTIVE'
                   and lower(a.email) <> lower(?) and lower(b.email) <> lower(?)
                   and not exists (select 1 from account_roles roles where roles.account_id in (a.id, b.id) and roles.role = 'ADMIN')
               ) select * from candidates c where not exists (
                 select 1 from growth_events g where g.event_name = 'CONTACTS_EXCHANGED'
                   and g.dedup_key = encode(sha256(convert_to(c.source, 'UTF8')), 'hex')
               ) order by created_at limit 200""",
            { rs, _ -> PairFact(rs.getObject("sender_account_id", UUID::class.java), rs.getObject("recipient_account_id", UUID::class.java), rs.getString("source"), rs.getTimestamp("created_at").toInstant()) },
            reviewEmail, reviewEmail,
        )
        pairs.forEach { p ->
            events.recordAt(p.sender, GrowthEvent.MAIL_REPLIED, p.source, p.at)
            events.recordAt(p.recipient, GrowthEvent.MAIL_REPLY_RECEIVED, p.source, p.at)
            events.recordAt(p.sender, GrowthEvent.CONTACTS_EXCHANGED, p.source, p.at)
            events.recordAt(p.recipient, GrowthEvent.CONTACTS_EXCHANGED, p.source, p.at)
        }
        return pairs.size
    }
}
