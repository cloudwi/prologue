package com.prologue.backend.growth

import com.prologue.backend.dailymeet.domain.model.ServiceDay
import com.prologue.backend.support.PostgresRepositoryTest
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.TestPropertySource
import org.springframework.test.context.transaction.TestTransaction
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.*

@Import(JdbcGrowthEvents::class, GrowthReportService::class, GrowthConnectionProjector::class)
@TestPropertySource(properties = ["review.email=review@example.invalid"])
class GrowthPipelineIT : PostgresRepositoryTest() {
    @Autowired lateinit var events: GrowthEvents
    @Autowired lateinit var reports: GrowthReportService
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var projector: GrowthConnectionProjector

    private fun account(email: String = "${UUID.randomUUID()}@example.invalid"): UUID = UUID.randomUUID().also {
        jdbc.update("insert into accounts(id, email, status, created_at) values (?, ?, 'ACTIVE', now())", it, email)
    }
    private fun count() = jdbc.queryForObject("select count(*) from growth_events", Long::class.java)!!
    private val now = ServiceDay.startOf(LocalDate.of(2026, 9, 20)).plusSeconds(3600)
    private fun historical(id: UUID, event: GrowthEvent, daysAgo: Long, key: String = UUID.randomUUID().toString()) {
        val time = now.minusSeconds(daysAgo * 86400)
        jdbc.update("insert into growth_events(id,account_id,event_name,dedup_key,occurred_at,service_day) values (?,?,?,?,?,?)",
            UUID.randomUUID(), id, event.name, key, Timestamp.from(time), java.sql.Date.valueOf(ServiceDay.of(time.atZone(ServiceDay.ZONE))))
    }
    private fun startCollection() {
        jdbc.update("update growth_collection set started_at = ?", Timestamp.from(now.minusSeconds(90 * 86400)))
    }

    @Test fun `retry is idempotent but distinct actions and users remain distinct`() {
        val a = account(); val b = account()
        events.record(a, GrowthEvent.ANSWER_SUBMITTED, "answer-one")
        events.record(a, GrowthEvent.ANSWER_SUBMITTED, "answer-one")
        events.record(a, GrowthEvent.ANSWER_SUBMITTED, "answer-two")
        events.record(b, GrowthEvent.ANSWER_SUBMITTED, "answer-one")
        assertEquals(3L, count())
        assertTrue(jdbc.queryForList("select dedup_key from growth_events", String::class.java).all { it != null && it.length == 64 && !it.contains("answer") })
    }
    @Test fun `rollback removes success facts and account deletion erases events`() {
        val a = account();events.record(a, GrowthEvent.REGISTERED, "registration")
        TestTransaction.flagForRollback();TestTransaction.end();TestTransaction.start()
        assertEquals(0L, count())
        val b = account();events.record(b, GrowthEvent.REGISTERED, "registration")
        jdbc.update("delete from accounts where id = ?", b)
        assertEquals(0L, count())
    }
    @Test fun `review and admin accounts do not inflate counts`() {
        val admin = account();jdbc.update("insert into account_roles(account_id,role) values (?, 'ADMIN')", admin)
        events.record(admin, GrowthEvent.ACTIVE_DAY, "today")
        events.record(account("review@example.invalid"), GrowthEvent.ACTIVE_DAY, "today")
        assertEquals(0L, count())
    }
    @Test fun `cohorts exclude immature users and successes before entry or after seven days`() {
        startCollection()
        val valid = account();historical(valid,GrowthEvent.REGISTERED,10);historical(valid,GrowthEvent.ANSWER_SUBMITTED,9)
        val late = account();historical(late,GrowthEvent.REGISTERED,10);historical(late,GrowthEvent.ANSWER_SUBMITTED,2)
        val early = account();historical(early,GrowthEvent.REGISTERED,10);historical(early,GrowthEvent.ANSWER_SUBMITTED,11)
        val fresh = account();historical(fresh,GrowthEvent.REGISTERED,1);historical(fresh,GrowthEvent.ANSWER_SUBMITTED,0)
        val rate=reports.report(30,now).rates.single { it.key=="signup_to_answer" }
        assertEquals(3L,rate.eligible);assertEquals(1L,rate.converted)
    }
    @Test fun `D7 uses service day and waits until the seventh day is over`() {
        startCollection()
        val returned=account();historical(returned,GrowthEvent.REGISTERED,10);historical(returned,GrowthEvent.ACTIVE_DAY,3)
        val wrongDay=account();historical(wrongDay,GrowthEvent.REGISTERED,10);historical(wrongDay,GrowthEvent.ACTIVE_DAY,2)
        val immature=account();historical(immature,GrowthEvent.REGISTERED,7);historical(immature,GrowthEvent.ACTIVE_DAY,0)
        val rate=reports.report(30,now).rates.single { it.key=="d7_retention" }
        assertEquals(2L,rate.eligible);assertEquals(1L,rate.converted)
    }
    @Test fun `availability counts answered days and a connection counts once for two participants`() {
        startCollection()
        val a=account();val b=account()
        historical(a,GrowthEvent.ANSWER_SUBMITTED,2);historical(a,GrowthEvent.PEER_AVAILABLE,2)
        historical(a,GrowthEvent.ANSWER_SUBMITTED,1);historical(a,GrowthEvent.PEER_AVAILABLE,3)
        historical(a,GrowthEvent.CONTACTS_EXCHANGED,1,"same-pair");historical(b,GrowthEvent.CONTACTS_EXCHANGED,1,"same-pair")
        val report=reports.report(30,now);val rate=report.rates.single { it.key=="answer_to_peer" }
        assertEquals(2L,rate.eligible);assertEquals(1L,rate.converted);assertEquals(1L,report.connectedPairs)
    }
    @Test fun `committed reciprocal letters produce one pair even with identical timestamps and retries`() {
        val a=account();val b=account()
        val at=Instant.now()
        fun mail(sender: UUID, recipient: UUID) {
            jdbc.update("insert into mails(id,sender_account_id,recipient_account_id,content,phone,kakao_id,ink_paid,status,created_at) values (?,?,?,'test fixture','01000000000',null,1,'PENDING',?)", UUID.randomUUID(),sender,recipient,Timestamp.from(at))
        }
        mail(a,b)
        assertEquals(0,projector.project())
        mail(b,a)
        assertEquals(1,projector.project());assertEquals(0,projector.project())
        assertEquals(2L,jdbc.queryForObject("select count(*) from growth_events where event_name='CONTACTS_EXCHANGED'",Long::class.java))
        assertEquals(1L,jdbc.queryForObject("select count(*) from growth_events where event_name='MAIL_REPLY_RECEIVED'",Long::class.java))
        assertEquals(1L,reports.report(30).connectedPairs)
    }

    @Test fun `empty cohort has unknown percentage not zero success`() {
        assertTrue(reports.report(30).rates.all { it.percent==null })
    }
}
