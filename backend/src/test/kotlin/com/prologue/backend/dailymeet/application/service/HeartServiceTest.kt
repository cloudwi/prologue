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

    private val answerRepository = mockk<AnswerRepository>()
    private val heartRepository = mockk<HeartRepository>(relaxed = true)
    private val mailRepository = mockk<com.prologue.backend.dailymeet.domain.repository.MailRepository>(relaxed = true)
    private val memberQueryService = mockk<MemberQueryService>()
    private val notificationService = mockk<com.prologue.backend.notification.application.service.NotificationService>(relaxed = true)
    private val service = HeartService(answerRepository, heartRepository, mailRepository, memberQueryService, notificationService)

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
        every { memberQueryService.findProfile(peer) } returns memberOf(peer, "고요한아침")
        every { answerRepository.findByAccountIdAndQuestionId(peer, 1L) } returns
            Answer.reconstitute(senderAnswerId, peer, 1L, "상대 답변", Instant.now())

        val result = service.receivedHearts(me)

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

}
