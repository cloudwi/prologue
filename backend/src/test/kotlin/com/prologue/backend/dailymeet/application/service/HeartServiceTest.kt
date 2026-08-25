package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class HeartServiceTest {

    private val answerRepository = mockk<AnswerRepository> {
        // 하트 카드의 답변 id 폴백(가장 최근 답)은 기본적으로 비어 있다 — 폴백을 보는 테스트에서만 채운다
        every { findAllByAccountId(any()) } returns emptyList()
    }
    private val heartRepository = mockk<HeartRepository>(relaxed = true)
    private val mailRepository = mockk<com.prologue.backend.dailymeet.domain.repository.MailRepository>(relaxed = true)
    private val memberQueryService = mockk<MemberQueryService>()
    private val notificationService = mockk<com.prologue.backend.notification.application.service.NotificationService>(relaxed = true)
    // 기본은 "방금 하트가 오갔고 잠긴 적 없음" — 잠금을 다루는 테스트에서만 시각을 되돌린다
    private val profileAccessService = mockk<ProfileAccessService> {
        every { unlockedPeers(any()) } returns emptySet()
        every { lastContactedAtByPeer(any()) } returns emptyMap()
    }
    private val service = HeartService(answerRepository, heartRepository, mailRepository, memberQueryService, notificationService, profileAccessService)

    private val me = UUID.randomUUID()
    private val peer = UUID.randomUUID()
    private val peerAnswerId = UUID.randomUUID()
    private val peerAnswer = Answer.reconstitute(peerAnswerId, peer, 1L, "상대 답변", Instant.now())

    @Test
    fun `상대 답변이 없으면 예외`() {
        every { answerRepository.findById(peerAnswerId) } returns null

        assertFailsWith<DailyMeetException> { service.heart(me, peerAnswerId) }
    }

    @Test
    fun `내 답변에는 하트할 수 없다`() {
        val mine = Answer.reconstitute(peerAnswerId, me, 1L, "내 답변", Instant.now())
        every { answerRepository.findById(peerAnswerId) } returns mine

        assertFailsWith<DailyMeetException> { service.heart(me, peerAnswerId) }
    }

    @Test
    fun `한쪽만 하트면 호감만 기록되고 매칭은 아니다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns false
        every { heartRepository.existsFromTo(peer, me) } returns false

        val result = service.heart(me, peerAnswerId)

        assertTrue(result.hearted)
        assertFalse(result.matched)
        verify { heartRepository.save(any<Heart>()) }
    }

    @Test
    fun `서로 하트면 매칭 - 마음이 통했다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns false
        every { heartRepository.existsFromTo(peer, me) } returns true

        val result = service.heart(me, peerAnswerId)

        assertTrue(result.matched)
    }

    // ── 받은 하트 목록 ──

    private fun memberOf(accountId: UUID, nickname: String) = Member.reconstitute(
        accountId = accountId,
        nickname = nickname,
        gender = Gender.FEMALE,
        birthDate = LocalDate.of(1997, 3, 22),
        preferredGender = Gender.MALE,
        region = "서울 마포구",
        createdAt = Instant.now(),
        photoUrls = listOf("https://example.com/1.jpg"),
    )

    @Test
    fun `받은 하트는 보낸 사람 요약과 행동 대상 답변 id를 담는다`() {
        val senderAnswerId = UUID.randomUUID()
        every { heartRepository.findAllTo(me) } returns listOf(Heart.send(peer, me, 1L))
        every { heartRepository.existsFromTo(me, peer) } returns false
        every { memberQueryService.findProfile(peer) } returns memberOf(peer, "고요한아침")
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns
            Answer.reconstitute(senderAnswerId, peer, 1L, "상대 답변", Instant.now())

        val result = service.receivedHearts(me)

        assertEquals(1, result.size)
        assertEquals("고요한아침", result[0].nickname)
        assertEquals(senderAnswerId, result[0].peerAnswerId)
        assertFalse(result[0].mutual)
    }

    @Test
    fun `서로 하트가 된 상대도 받은 하트에 남되 mutual로 표시된다`() {
        val senderAnswerId = UUID.randomUUID()
        every { heartRepository.findAllTo(me) } returns listOf(Heart.send(peer, me, 1L))
        every { heartRepository.existsFromTo(me, peer) } returns true
        every { heartRepository.existsFromTo(peer, me) } returns true
        every { memberQueryService.findProfile(peer) } returns memberOf(peer, "고요한아침")
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns
            Answer.reconstitute(senderAnswerId, peer, 1L, "상대 답변", Instant.now())

        val result = service.receivedHearts(me)

        assertEquals(1, result.size)
        assertTrue(result[0].mutual)
    }

    @Test
    fun `보낸 하트는 받는 사람 요약과 내가 하트한 답변 id를 담는다 - 답이 없으면 mutual=false`() {
        every { heartRepository.findAllFrom(me) } returns listOf(Heart.send(me, peer, 1L))
        every { heartRepository.existsFromTo(me, peer) } returns true
        every { heartRepository.existsFromTo(peer, me) } returns false
        every { memberQueryService.findProfile(peer) } returns memberOf(peer, "고요한아침")
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns peerAnswer

        val result = service.sentHearts(me)

        assertEquals(1, result.size)
        assertEquals("고요한아침", result[0].nickname)
        assertEquals(peerAnswerId, result[0].peerAnswerId)
        assertFalse(result[0].mutual)
    }

    @Test
    fun `보낸 하트 - 상대가 되보냈으면 mutual, 같은 사람에게 여러 날 보냈어도 한 줄`() {
        every { heartRepository.findAllFrom(me) } returns listOf(Heart.send(me, peer, 1L), Heart.send(me, peer, 2L))
        every { heartRepository.existsFromTo(me, peer) } returns true
        every { heartRepository.existsFromTo(peer, me) } returns true
        every { memberQueryService.findProfile(peer) } returns memberOf(peer, "고요한아침")
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns peerAnswer

        val result = service.sentHearts(me)

        assertEquals(1, result.size)
        assertTrue(result[0].mutual)
    }

    @Test
    fun `같은 사람이 여러 날 보낸 하트는 한 줄로 합쳐진다`() {
        every { heartRepository.findAllTo(me) } returns listOf(Heart.send(peer, me, 1L), Heart.send(peer, me, 2L))
        every { heartRepository.existsFromTo(me, peer) } returns false
        every { memberQueryService.findProfile(peer) } returns memberOf(peer, "고요한아침")
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns null

        assertEquals(1, service.receivedHearts(me).size)
    }


    @Test
    fun `받은 하트 - 상대가 그 질문에 답한 적 없으면 가장 최근 답으로 카드를 연다`() {
        // 후보 범위를 며칠치로 넓힌 뒤로는 상대가 '내가 답한 그 질문'에 답한 적이 없을 수 있다.
        // 그때 답변 id가 null이면 카드가 열리지 않아 받은 호감이 막다른 길이 된다.
        val recent = Answer.reconstitute(UUID.randomUUID(), peer, 77L, "다른 질문에 남긴 답", Instant.now())
        every { heartRepository.findAllTo(me) } returns listOf(Heart.send(peer, me, 1L))
        every { heartRepository.existsFromTo(me, peer) } returns false
        every { memberQueryService.findProfile(peer) } returns memberOf(peer, "고요한아침")
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns null // 그 질문엔 답한 적 없음
        every { answerRepository.findAllByAccountId(peer) } returns listOf(recent)

        assertEquals(recent.id, service.receivedHearts(me).single().peerAnswerId)
    }

    @Test
    fun `받은 하트 - 사흘이 지나도록 아무 움직임이 없으면 목록에서 사라진다`() {
        val stale = Instant.now().minus(java.time.Duration.ofDays(10))
        every { heartRepository.findAllTo(me) } returns
            listOf(Heart.reconstitute(UUID.randomUUID(), peer, me, 1L, stale))
        every { heartRepository.existsFromTo(any(), any()) } returns false
        every { memberQueryService.findProfile(peer) } returns Member.reconstitute(
            peer, "닉", Gender.FEMALE, LocalDate.of(1995, 5, 14), Gender.MALE, "서울특별시 강남구", Instant.now(),
            photoUrls = listOf("a.jpg", "b.jpg"),
        )
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns peerAnswer

        assertTrue(service.receivedHearts(me).isEmpty())
    }

    @Test
    fun `받은 하트 - 사흘이 지나도 서로 하트면 잠긴 채로 남는다`() {
        val stale = Instant.now().minus(java.time.Duration.ofDays(10))
        every { heartRepository.findAllTo(me) } returns
            listOf(Heart.reconstitute(UUID.randomUUID(), peer, me, 1L, stale))
        every { heartRepository.existsFromTo(me, peer) } returns true
        every { heartRepository.existsFromTo(peer, me) } returns true
        every { memberQueryService.findProfile(peer) } returns Member.reconstitute(
            peer, "닉", Gender.FEMALE, LocalDate.of(1995, 5, 14), Gender.MALE, "서울특별시 강남구", Instant.now(),
            photoUrls = listOf("a.jpg", "b.jpg"),
        )
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns peerAnswer

        val received = service.receivedHearts(me)[0]

        assertTrue(received.locked)
        assertEquals(null, received.photoUrl)
        // 누구인지는 남는다 — 잉크를 쓸지 정하려면 알아야 한다
        assertEquals("닉", received.nickname)
    }

    @Test
    fun `보낸 하트 - 사흘이 지나도 목록에 남는다(편지는 언제든 보낼 수 있다)`() {
        val stale = Instant.now().minus(java.time.Duration.ofDays(10))
        every { heartRepository.findAllFrom(me) } returns
            listOf(Heart.reconstitute(UUID.randomUUID(), me, peer, 1L, stale))
        every { heartRepository.existsFromTo(any(), any()) } returns false
        every { memberQueryService.findProfile(peer) } returns Member.reconstitute(
            peer, "닉", Gender.FEMALE, LocalDate.of(1995, 5, 14), Gender.MALE, "서울특별시 강남구", Instant.now(),
            photoUrls = listOf("a.jpg", "b.jpg"),
        )
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns peerAnswer

        assertEquals(1, service.sentHearts(me).size)
        assertTrue(service.sentHearts(me)[0].locked)
    }

    @Test
    fun `받은 하트 - 사흘 안이면 사진이 그대로 보인다`() {
        every { heartRepository.findAllTo(me) } returns
            listOf(Heart.reconstitute(UUID.randomUUID(), peer, me, 1L, Instant.now()))
        every { memberQueryService.findProfile(peer) } returns Member.reconstitute(
            peer, "닉", Gender.FEMALE, LocalDate.of(1995, 5, 14), Gender.MALE, "서울특별시 강남구", Instant.now(),
            photoUrls = listOf("a.jpg", "b.jpg"),
        )
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns peerAnswer

        val received = service.receivedHearts(me)[0]

        assertFalse(received.locked)
        assertEquals("a.jpg", received.photoUrl)
    }
}
