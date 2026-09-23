package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.GateStatus
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.GenderGatePolicy
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberGate
import com.prologue.backend.member.domain.repository.MemberGateRepository
import com.prologue.backend.notification.application.service.NotificationService
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MemberGateServiceTest {

    private val gateRepository = mockk<MemberGateRepository>(relaxed = true) {
        every { findByAccountId(any()) } returns null
        every { countWaiting() } returns 0
    }
    private val notificationService = mockk<NotificationService>(relaxed = true)

    private fun service(enabled: Boolean, ratio: Double = 0.8, activeDays: Int = 14) =
        MemberGateService(gateRepository, notificationService, enabled, ratio, activeDays)

    private fun member(gender: Gender, id: UUID = UUID.randomUUID()) = Member.reconstitute(
        id, "닉", gender, LocalDate.of(1995, 5, 14), null, "서울", Instant.now(),
    )

    // ── 정책 ──

    @Test
    fun `정책 - 켜져 있을 때 남성만 걸리고 여성은 영향이 없다`() {
        val on = GenderGatePolicy(enabled = true, minFemaleRatio = 0.8, activeDays = 14)
        assertTrue(on.gates(Gender.MALE))
        assertFalse(on.gates(Gender.FEMALE))

        val off = GenderGatePolicy(enabled = false, minFemaleRatio = 0.8, activeDays = 14)
        assertFalse(off.gates(Gender.MALE))
    }

    @Test
    fun `정책 - 들일 수 있는 수는 floor(활성여성 나누기 기준)에서 활성남성을 뺀 값이다`() {
        val policy = GenderGatePolicy(enabled = true, minFemaleRatio = 0.8, activeDays = 14)
        // 여 8 / 0.8 = 10명까지 남성이 있을 수 있다 → 지금 남 6 → 4명
        assertEquals(4, policy.admittable(activeFemale = 8, activeMale = 6))
        // 정확히 맞으면 0
        assertEquals(0, policy.admittable(activeFemale = 8, activeMale = 10))
        // 이미 기울었으면 음수가 아니라 0 — 더 들이지 않는다
        assertEquals(0, policy.admittable(activeFemale = 3, activeMale = 20))
        // 여성이 한 명도 없으면 아무도 못 들어온다
        assertEquals(0, policy.admittable(activeFemale = 0, activeMale = 0))
        // 소수점은 버린다 — 여 7 / 0.8 = 8.75 → 8
        assertEquals(8, policy.admittable(activeFemale = 7, activeMale = 0))
    }

    @Test
    fun `정책 - 꺼져 있으면 아무도 들이지 않는다(들일 사람도 없다)`() {
        val off = GenderGatePolicy(enabled = false, minFemaleRatio = 0.8, activeDays = 14)
        assertEquals(0, off.admittable(activeFemale = 100, activeMale = 0))
    }

    // ── 줄 세우기 ──

    @Test
    fun `켜져 있으면 신규 남성은 WAITING으로 줄을 선다`() {
        val man = member(Gender.MALE)
        val saved = slot<MemberGate>()
        every { gateRepository.save(capture(saved)) } answers { saved.captured }

        assertTrue(service(enabled = true).enqueueIfNeeded(man))

        assertEquals(man.accountId, saved.captured.accountId)
        assertEquals(GateStatus.WAITING, saved.captured.status)
    }

    @Test
    fun `여성은 줄을 서지 않는다 - 행이 생기지 않는다`() {
        assertFalse(service(enabled = true).enqueueIfNeeded(member(Gender.FEMALE)))
        verify(exactly = 0) { gateRepository.save(any()) }
    }

    @Test
    fun `꺼져 있으면 남성도 줄을 서지 않는다`() {
        assertFalse(service(enabled = false).enqueueIfNeeded(member(Gender.MALE)))
        verify(exactly = 0) { gateRepository.save(any()) }
    }

    @Test
    fun `이미 행이 있으면 다시 세우지 않는다`() {
        val man = member(Gender.MALE)
        every { gateRepository.findByAccountId(man.accountId) } returns MemberGate.enqueue(man.accountId)

        assertFalse(service(enabled = true).enqueueIfNeeded(man))
        verify(exactly = 0) { gateRepository.save(any()) }
    }

    // ── 상태 읽기 ──

    @Test
    fun `꺼져 있으면 WAITING 행이 있어도 게이트 무관으로 답한다`() {
        val id = UUID.randomUUID()
        every { gateRepository.findByAccountId(id) } returns MemberGate.enqueue(id)
        every { gateRepository.findAllWaitingIds() } returns setOf(id)

        val off = service(enabled = false)
        assertNull(off.statusOf(id))
        assertFalse(off.isWaiting(id))
        assertTrue(off.waitingIds().isEmpty())
        assertNull(off.waitingPosition(id))
    }

    @Test
    fun `켜져 있으면 행이 없는 사람은 게이트 무관이고 행이 있으면 그 상태다`() {
        val waiting = UUID.randomUUID()
        every { gateRepository.findByAccountId(waiting) } returns MemberGate.enqueue(waiting)
        every { gateRepository.findAllWaitingIds() } returns setOf(waiting)

        val on = service(enabled = true)
        assertNull(on.statusOf(UUID.randomUUID())) // 게이트 이전 회원 — fail-open
        assertEquals(GateStatus.WAITING, on.statusOf(waiting))
        assertTrue(on.isWaiting(waiting))
        assertEquals(setOf(waiting), on.waitingIds())
    }

    // ── 들이기 ──

    @Test
    fun `수동 입장 - 기다리던 사람은 ADMITTED가 되고 알림을 받는다`() {
        val id = UUID.randomUUID()
        val gate = MemberGate.enqueue(id)
        every { gateRepository.findByAccountId(id) } returns gate
        every { gateRepository.save(any()) } answers { firstArg() }

        assertTrue(service(enabled = true).admit(id))

        assertEquals(GateStatus.ADMITTED, gate.status)
        assertEquals(MemberGate.ADMITTED_BY_ADMIN, gate.admittedBy)
        verify(exactly = 1) { notificationService.gateAdmitted(id) }
    }

    @Test
    fun `수동 입장 - 행이 없거나 이미 들어온 사람은 아무 일도 없다`() {
        val admitted = UUID.randomUUID()
        every { gateRepository.findByAccountId(admitted) } returns MemberGate.enqueue(admitted).apply { admit("ADMIN") }

        val on = service(enabled = true)
        assertFalse(on.admit(UUID.randomUUID()))
        assertFalse(on.admit(admitted))
        verify(exactly = 0) { notificationService.gateAdmitted(any()) }
    }

    @Test
    fun `자동 입장 - 비율이 남는 만큼 오래 기다린 순으로 들인다`() {
        // 여 8 · 남 6 → 4명 자리. 대기 5명 중 앞의 4명만.
        every { gateRepository.countActiveByGender(any()) } returns mapOf(Gender.FEMALE to 8, Gender.MALE to 6)
        val base = Instant.parse("2026-09-01T00:00:00Z")
        val queue = (0 until 5).map { MemberGate.enqueue(UUID.randomUUID(), base.plusSeconds(it * 60L)) }
        val asked = slot<Int>()
        every { gateRepository.findWaitingOrdered(capture(asked)) } answers { queue.take(asked.captured) }
        every { gateRepository.save(any()) } answers { firstArg() }

        val admitted = service(enabled = true).autoAdmit(now = base.plusSeconds(3600))

        assertEquals(4, asked.captured)
        assertEquals(queue.take(4).map { it.accountId }, admitted)
        queue.take(4).forEach {
            assertEquals(GateStatus.ADMITTED, it.status)
            assertEquals(MemberGate.ADMITTED_BY_AUTO, it.admittedBy)
            verify(exactly = 1) { notificationService.gateAdmitted(it.accountId) }
        }
        assertTrue(queue[4].waiting)
    }

    @Test
    fun `자동 입장 - 비율이 기준에 못 미치면 아무도 들이지 않는다`() {
        every { gateRepository.countActiveByGender(any()) } returns mapOf(Gender.FEMALE to 3, Gender.MALE to 10)

        assertTrue(service(enabled = true).autoAdmit().isEmpty())
        verify(exactly = 0) { gateRepository.findWaitingOrdered(any()) }
        verify(exactly = 0) { notificationService.gateAdmitted(any()) }
    }

    @Test
    fun `자동 입장 - 꺼져 있으면 성비를 재지도 않는다`() {
        assertTrue(service(enabled = false).autoAdmit().isEmpty())
        verify(exactly = 0) { gateRepository.countActiveByGender(any()) }
    }

    @Test
    fun `자동 입장 - 활성 기준 일수만큼 거슬러 올라가 센다`() {
        val since = slot<Instant>()
        every { gateRepository.countActiveByGender(capture(since)) } returns emptyMap()
        val now = Instant.parse("2026-09-23T03:00:00Z")

        service(enabled = true, activeDays = 14).autoAdmit(now)

        assertEquals(Instant.parse("2026-09-09T03:00:00Z"), since.captured)
    }

    @Test
    fun `현황 - 활성 남녀 수와 대기 인원과 들일 수 있는 수를 한 번에 돌려준다`() {
        every { gateRepository.countActiveByGender(any()) } returns mapOf(Gender.FEMALE to 8, Gender.MALE to 6)
        every { gateRepository.countWaiting() } returns 5

        val census = service(enabled = true).census()

        assertEquals(GateCensus(enabled = true, activeFemale = 8, activeMale = 6, waiting = 5, admittable = 4), census)
        // 꺼져 있어도 수는 센다 — 켤지 판단하는 재료다. 들일 수 있는 수만 0.
        assertEquals(0, service(enabled = false).census().admittable)
        assertEquals(8, service(enabled = false).census().activeFemale)
    }
}
