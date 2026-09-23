package com.prologue.backend.member.infrastructure.persistence

import com.prologue.backend.member.domain.model.GateStatus
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberGate
import com.prologue.backend.support.PostgresRepositoryTest
import java.sql.Timestamp
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate

/**
 * 성비 게이트 대기열 — 진짜 Postgres 위에서.
 *
 * V72의 표가 엔티티와 맞는지(ddl-auto validate), 대기 순서·내 차례·활성 성비 집계 쿼리가
 * 실제 SQL로 풀리는지는 여기서만 확인된다. 활성 집계는 accounts와 members를 잇는 네이티브 쿼리라
 * 계정 행을 직접 심는다.
 */
@Import(MemberGatePersistenceAdapter::class, MemberPersistenceAdapter::class)
class MemberGatePersistenceAdapterIT : PostgresRepositoryTest() {

    @Autowired
    private lateinit var gates: MemberGatePersistenceAdapter

    @Autowired
    private lateinit var members: MemberPersistenceAdapter

    @Autowired
    private lateinit var jdbc: JdbcTemplate

    private val base = Instant.parse("2026-09-01T00:00:00Z")

    /** 계정 + 프로필 한 쌍. 게이트의 성비는 accounts.status·last_seen_at과 members.gender를 함께 본다. */
    private fun person(gender: Gender, status: String = "ACTIVE", lastSeenAt: Instant? = Instant.now()): UUID {
        val id = UUID.randomUUID()
        jdbc.update(
            "insert into accounts(id, email, status, created_at, last_seen_at) values (?, ?, ?, now(), ?)",
            id, "$id@test.local", status, lastSeenAt?.let { Timestamp.from(it) },
        )
        members.save(
            Member.register(
                accountId = id, nickname = "테스터", gender = gender, birthDate = LocalDate.of(1995, 5, 14),
                preferredGender = if (gender == Gender.MALE) Gender.FEMALE else Gender.MALE,
                region = "서울", phone = "01012345678",
            ),
        )
        return id
    }

    @Test
    fun `줄을 서면 WAITING으로 저장되고 들이면 ADMITTED로 바뀐다`() {
        val id = UUID.randomUUID()
        gates.save(MemberGate.enqueue(id, base))

        val waiting = gates.findByAccountId(id)!!
        assertEquals(GateStatus.WAITING, waiting.status)
        assertTrue(waiting.waiting)

        waiting.admit(MemberGate.ADMITTED_BY_ADMIN, base.plusSeconds(60))
        gates.save(waiting)

        val admitted = gates.findByAccountId(id)!!
        assertEquals(GateStatus.ADMITTED, admitted.status)
        assertEquals(MemberGate.ADMITTED_BY_ADMIN, admitted.admittedBy)
        assertEquals(base.plusSeconds(60), admitted.admittedAt)
        assertNull(gates.waitingPosition(id))
    }

    @Test
    fun `기다리는 사람은 오래된 순으로 읽히고 내 차례는 앞사람 수 더하기 하나다`() {
        val first = UUID.randomUUID()
        val second = UUID.randomUUID()
        val third = UUID.randomUUID()
        // 저장 순서와 줄 선 시각을 일부러 어긋나게 — 순서는 queued_at이 정한다
        gates.save(MemberGate.enqueue(third, base.plusSeconds(300)))
        gates.save(MemberGate.enqueue(first, base))
        gates.save(MemberGate.enqueue(second, base.plusSeconds(60)))
        // 이미 들어온 사람은 줄에 없다
        gates.save(MemberGate.enqueue(UUID.randomUUID(), base.minusSeconds(999)).apply { admit(MemberGate.ADMITTED_BY_AUTO) })

        assertEquals(listOf(first, second), gates.findWaitingOrdered(2).map { it.accountId })
        assertEquals(listOf(first, second, third), gates.findWaitingOrdered(10).map { it.accountId })
        assertTrue(gates.findWaitingOrdered(0).isEmpty())
        assertEquals(setOf(first, second, third), gates.findAllWaitingIds())
        assertEquals(3, gates.countWaiting())

        assertEquals(1, gates.waitingPosition(first))
        assertEquals(2, gates.waitingPosition(second))
        assertEquals(3, gates.waitingPosition(third))
        assertNull(gates.waitingPosition(UUID.randomUUID()))
    }

    @Test
    fun `활성 성비는 살아 있는 계정이 최근에 접속한 프로필만 센다`() {
        val since = Instant.now().minus(Duration.ofDays(14))
        person(Gender.FEMALE)
        person(Gender.FEMALE)
        person(Gender.MALE)
        // 세지 않는 사람들 — 오래전 접속, 접속 기록 없음, 정지·탈퇴 계정
        person(Gender.FEMALE, lastSeenAt = since.minusSeconds(3600))
        person(Gender.MALE, lastSeenAt = null)
        person(Gender.MALE, status = "SUSPENDED")
        person(Gender.FEMALE, status = "WITHDRAWN")

        val active = gates.countActiveByGender(since)

        assertEquals(2, active[Gender.FEMALE])
        assertEquals(1, active[Gender.MALE])
    }
}
