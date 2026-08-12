package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.ProfileUnlock
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.dailymeet.domain.repository.ProfileUnlockRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ProfileAccessServiceTest {

    private val answerRepository = mockk<AnswerRepository>()
    private val dailyRevealRepository = mockk<DailyRevealRepository>(relaxed = true)
    private val heartRepository = mockk<HeartRepository>(relaxed = true)
    private val mailRepository = mockk<MailRepository> {
        every { findLastMailedAtByPeer(any()) } returns emptyMap()
    }
    private val profileUnlockRepository = mockk<ProfileUnlockRepository>()
    private val inkService = mockk<InkService>(relaxed = true)
    private val service = ProfileAccessService(
        answerRepository, dailyRevealRepository, heartRepository, mailRepository, profileUnlockRepository, inkService,
    )

    private val me = UUID.randomUUID()
    private val peer = UUID.randomUUID()
    private val peerAnswerId = UUID.randomUUID()
    private val peerAnswer = Answer.reconstitute(peerAnswerId, peer, 1L, "상대 답변", Instant.now())

    private fun daysAgo(days: Long): Instant = Instant.now().minus(Duration.ofDays(days))

    @Test
    fun `닫힌 프로필을 열면 잉크 한 장이 나간다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns emptySet()
        every { dailyRevealRepository.findLastRevealedAtBetween(me, peer) } returns daysAgo(10)
        every { heartRepository.findLastHeartedAtByPeer(me) } returns emptyMap()
        every { profileUnlockRepository.saveIfNew(any()) } returns true
        every { inkService.balance(me) } returns 4

        val result = service.unlock(me, peerAnswerId)

        assertTrue(result.spent)
        assertEquals(4, result.balance)
        verify(exactly = 1) { inkService.spend(me, InkPrice.PROFILE_UNLOCK, InkService.REASON_PROFILE_UNLOCK) }
    }

    @Test
    fun `아직 열려 있는 상대에게는 잉크를 쓰지 않는다`() {
        // 지금 공짜로 볼 수 있는 걸 받고 파는 건 값을 받는 게 아니라 속이는 것이다.
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns emptySet()
        every { dailyRevealRepository.findLastRevealedAtBetween(me, peer) } returns daysAgo(1)
        every { heartRepository.findLastHeartedAtByPeer(me) } returns emptyMap()
        every { inkService.balance(me) } returns 5

        val result = service.unlock(me, peerAnswerId)

        assertFalse(result.spent)
        verify(exactly = 0) { inkService.spend(any(), any(), any()) }
        verify(exactly = 0) { profileUnlockRepository.saveIfNew(any()) }
    }

    @Test
    fun `이미 열어둔 상대는 다시 사지 않는다`() {
        // 실패로 답하면 앱이 재시도한다 — 성공으로 답하되 잉크는 쓰지 않는다.
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns setOf(peer)
        every { inkService.balance(me) } returns 5

        val result = service.unlock(me, peerAnswerId)

        assertFalse(result.spent)
        verify(exactly = 0) { inkService.spend(any(), any(), any()) }
    }

    @Test
    fun `같은 순간에 두 번 들어와도 잉크는 한 번만 나간다`() {
        // 조회는 둘 다 "없음"을 볼 수 있다 — 그 틈은 유니크 제약만이 막는다.
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns emptySet()
        every { dailyRevealRepository.findLastRevealedAtBetween(me, peer) } returns daysAgo(10)
        every { heartRepository.findLastHeartedAtByPeer(me) } returns emptyMap()
        every { profileUnlockRepository.saveIfNew(any()) } returns false // 먼저 온 쪽이 이미 기록했다
        every { inkService.balance(me) } returns 5

        val result = service.unlock(me, peerAnswerId)

        assertFalse(result.spent)
        verify(exactly = 0) { inkService.spend(any(), any(), any()) }
    }

    @Test
    fun `잉크는 기록이 남은 뒤에만 나간다`() {
        // 기록의 유니크 제약이 중복 차감을 막는 자물쇠다 — 차감이 먼저면 그 사이 두 장이 나갈 수 있다.
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns emptySet()
        every { dailyRevealRepository.findLastRevealedAtBetween(me, peer) } returns daysAgo(10)
        every { heartRepository.findLastHeartedAtByPeer(me) } returns emptyMap()
        val saved = slot<ProfileUnlock>()
        every { profileUnlockRepository.saveIfNew(capture(saved)) } returns true
        every { inkService.balance(me) } returns 4

        service.unlock(me, peerAnswerId)

        assertEquals(me, saved.captured.accountId)
        assertEquals(peer, saved.captured.peerAccountId)
    }

    @Test
    fun `이어진 적 없는 상대는 잉크로도 열 수 없다`() {
        // 답변 id만 알면 아무나 열어볼 수 있으면 잠금이 아니라 가격표다.
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns emptySet()
        every { dailyRevealRepository.findLastRevealedAtBetween(me, peer) } returns null
        every { heartRepository.findLastHeartedAtByPeer(me) } returns emptyMap()

        assertFailsWith<DailyMeetException> { service.unlock(me, peerAnswerId) }
        verify(exactly = 0) { inkService.spend(any(), any(), any()) }
    }

    @Test
    fun `소개가 없어도 하트를 받았다면 이어진 것이다`() {
        // 소개는 한쪽 화면에만 뜬다 — 나를 보고 하트만 보낸 상대가 있다.
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns emptySet()
        every { dailyRevealRepository.findLastRevealedAtBetween(me, peer) } returns null
        every { heartRepository.findLastHeartedAtByPeer(me) } returns mapOf(peer to daysAgo(10))
        every { profileUnlockRepository.saveIfNew(any()) } returns true
        every { inkService.balance(me) } returns 4

        assertTrue(service.unlock(me, peerAnswerId).spent)
    }

    @Test
    fun `창은 소개와 하트 중 더 최근 쪽부터 흐른다`() {
        // 소개는 열흘 전이지만 어제 하트가 오갔다면 아직 열려 있어야 한다.
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns emptySet()
        every { dailyRevealRepository.findLastRevealedAtBetween(me, peer) } returns daysAgo(10)
        every { heartRepository.findLastHeartedAtByPeer(me) } returns mapOf(peer to daysAgo(1))
        every { inkService.balance(me) } returns 5

        assertFalse(service.unlock(me, peerAnswerId).spent)
        verify(exactly = 0) { inkService.spend(any(), any(), any()) }
    }

    @Test
    fun `편지를 주고받은 상대는 소개가 오래됐어도 열려 있다`() {
        // 편지는 잉크를 쓰고 연락처를 건넨 상대다 — 그걸 사흘 뒤 잠그면 산 것을 도로 뺏는 셈이다.
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { profileUnlockRepository.findPeerAccountIds(me) } returns emptySet()
        every { dailyRevealRepository.findLastRevealedAtBetween(me, peer) } returns daysAgo(10)
        every { heartRepository.findLastHeartedAtByPeer(me) } returns emptyMap()
        every { mailRepository.findLastMailedAtByPeer(me) } returns mapOf(peer to daysAgo(1))
        every { inkService.balance(me) } returns 5

        assertFalse(service.unlock(me, peerAnswerId).spent)
        verify(exactly = 0) { inkService.spend(any(), any(), any()) }
    }

    @Test
    fun `내 프로필은 열 대상이 아니다`() {
        every { answerRepository.findById(peerAnswerId) } returns
            Answer.reconstitute(peerAnswerId, me, 1L, "내 답변", Instant.now())

        assertFailsWith<DailyMeetException> { service.unlock(me, peerAnswerId) }
    }
}
