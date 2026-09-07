package com.prologue.backend.growth

import com.prologue.backend.dailymeet.domain.model.ServiceDay
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.time.Duration
import java.time.Instant

/** Counts are users unless explicitly marked as events/pairs. Never return account IDs or contents. */
data class GrowthCount(val event: String, val events: Long, val users: Long)
data class GrowthRate(val key: String, val eligible: Long, val converted: Long) {
    val percent: Double? get() = if (eligible == 0L) null else converted * 100.0 / eligible
}
data class GrowthReport(
    val trackingSince: Instant, val from: Instant, val until: Instant,
    val counts: List<GrowthCount>, val rates: List<GrowthRate>, val connectedPairs: Long,
)

@Service
class GrowthReportService(private val jdbc: JdbcTemplate) {
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    fun report(days: Int, now: Instant = Instant.now()): GrowthReport {
        require(days in 1..90)
        val start = ServiceDay.startOf(ServiceDay.of(now.atZone(ServiceDay.ZONE)).minusDays(days - 1L))
        val since = jdbc.queryForObject("select started_at from growth_collection where id = 1", Timestamp::class.java)!!.toInstant()
        val from = maxOf(start, since)
        val counts = jdbc.query(
            """select event_name, count(*) as events, count(distinct account_id) as users
               from growth_events where occurred_at >= ? and occurred_at < ? group by event_name""",
            { rs, _ -> GrowthCount(rs.getString("event_name"), rs.getLong("events"), rs.getLong("users")) },
            Timestamp.from(from), Timestamp.from(now),
        )
        fun count(sql: String, vararg args: Any): Long = jdbc.queryForObject(sql, Long::class.java, *args) ?: 0
        // Cohort entry is the first qualifying event in the selected period. Give everyone a full 7 days.
        fun conversion(key: String, entry: GrowthEvent, success: GrowthEvent): GrowthRate {
            val rows = jdbc.queryForMap(
                """with cohort as (
                     select account_id, min(occurred_at) as entered from growth_events
                     where event_name = ? and occurred_at >= ? and occurred_at < ? group by account_id
                   ) select count(*) as eligible, count(*) filter (where exists (
                     select 1 from growth_events s where s.account_id = c.account_id and s.event_name = ?
                     and s.occurred_at >= c.entered and s.occurred_at < c.entered + interval '7 days'
                   )) as converted from cohort c where c.entered <= ?""",
                entry.name, Timestamp.from(from), Timestamp.from(now), success.name,
                Timestamp.from(now.minus(Duration.ofDays(7))),
            )
            return GrowthRate(key, (rows["eligible"] as Number).toLong(), (rows["converted"] as Number).toLong())
        }
        val availability = jdbc.queryForMap(
            """with answered_days as (
                 select distinct account_id, service_day from growth_events where event_name = 'ANSWER_SUBMITTED'
                 and occurred_at >= ? and occurred_at < ? and service_day < ?
               ) select count(*) as eligible, count(*) filter (where exists (
                 select 1 from growth_events s where s.account_id = a.account_id and s.service_day = a.service_day
                 and s.event_name = 'PEER_AVAILABLE'
               )) as converted from answered_days a""",
            Timestamp.from(from), Timestamp.from(now), java.sql.Date.valueOf(ServiceDay.of(now.atZone(ServiceDay.ZONE))),
        )
        val retention = jdbc.queryForMap(
            """with cohort as (
                 select account_id, service_day from growth_events where event_name = 'REGISTERED'
                 and occurred_at >= ? and occurred_at < ? and service_day + 8 <= ?
               ) select count(*) as eligible, count(*) filter (where exists (
                 select 1 from growth_events s where s.account_id = c.account_id and s.event_name = 'ACTIVE_DAY'
                 and s.service_day = c.service_day + 7
               )) as converted from cohort c""",
            Timestamp.from(from), Timestamp.from(now), java.sql.Date.valueOf(ServiceDay.of(now.atZone(ServiceDay.ZONE))),
        )
        val rates = listOf(
            conversion("signup_to_answer", GrowthEvent.REGISTERED, GrowthEvent.ANSWER_SUBMITTED),
            GrowthRate("answer_to_peer", (availability["eligible"] as Number).toLong(), (availability["converted"] as Number).toLong()),
            conversion("peer_to_heart", GrowthEvent.PEER_AVAILABLE, GrowthEvent.HEART_SENT),
            conversion("peer_to_mail", GrowthEvent.PEER_AVAILABLE, GrowthEvent.MAIL_SENT),
            conversion("mail_to_reply", GrowthEvent.MAIL_SENT, GrowthEvent.MAIL_REPLY_RECEIVED),
            GrowthRate("d7_retention", (retention["eligible"] as Number).toLong(), (retention["converted"] as Number).toLong()),
        )
        return GrowthReport(since, from, now, counts, rates, count(
            "select count(distinct dedup_key) from growth_events where event_name = 'CONTACTS_EXCHANGED' and occurred_at >= ? and occurred_at < ?",
            Timestamp.from(from), Timestamp.from(now),
        ))
    }
}
