package com.prologue.backend.growth

import com.prologue.backend.dailymeet.domain.model.ServiceDay
import jakarta.persistence.EntityManager
import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

@Component
class JdbcGrowthEvents(private val jdbc: JdbcTemplate, private val em: EntityManager,
    @param:Value("\${review.email:}") private val reviewEmail: String = "",
) : GrowthEvents {
    /** Joins the business transaction: a failed/rolled-back action cannot leave a success event. */
    @Transactional(propagation = Propagation.MANDATORY)
    override fun record(accountId: UUID, event: GrowthEvent, source: String) = recordAt(accountId, event, source, Instant.now())

    @Transactional(propagation = Propagation.MANDATORY)
    fun recordAt(accountId: UUID, event: GrowthEvent, source: String, now: Instant) {
        require(source.isNotBlank() && source.length <= 200)
        em.flush() // New accounts must exist before the FK-backed event insert.
        val key = MessageDigest.getInstance("SHA-256").digest(source.toByteArray()).joinToString("") { "%02x".format(it) }
        jdbc.update(
            """insert into growth_events(id, account_id, event_name, dedup_key, occurred_at, service_day)
               select ?, a.id, ?, ?, ?, ? from accounts a
               where a.id = ? and a.status = 'ACTIVE' and lower(a.email) <> lower(?)
               and not exists (select 1 from account_roles r where r.account_id = a.id and r.role = 'ADMIN')
               on conflict (account_id, event_name, dedup_key) do nothing""",
            UUID.randomUUID(), event.name, key, Timestamp.from(now),
            java.sql.Date.valueOf(ServiceDay.of(now.atZone(ServiceDay.ZONE))), accountId, reviewEmail,
        )
    }
}
