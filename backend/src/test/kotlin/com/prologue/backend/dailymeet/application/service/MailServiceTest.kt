package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class MailServiceTest {

    private val answerRepository = mockk<AnswerRepository>()
    private val mailRepository = mockk<MailRepository>()
    private val memberQueryService = mockk<MemberQueryService>()
    private val stampService = mockk<StampService>(relaxed = true)
    private val service = MailService(answerRepository, mailRepository, memberQueryService, stampService)

    private val senderId = UUID.randomUUID()
    private val recipientId = UUID.randomUUID()
    private val peerAnswerId = UUID.randomUUID()
    private val peerAnswer = Answer.reconstitute(peerAnswerId, recipientId, 1L, "상대 답변", Instant.now())

    private fun sender(phone: String? = "01012345678"): Member =
        Member.reconstitute(
            senderId, "발신인", Gender.MALE, LocalDate.of(1995, 5, 14), Gender.FEMALE, "서울",
            Instant.now(), phone = phone,
        )

    private fun stubSaved() {
        val saved = slot<Mail>()
        every { mailRepository.save(capture(saved)) } answers {
            val m = saved.captured
            Mail.reconstitute(UUID.randomUUID(), m.senderAccountId, m.recipientAccountId, m.content, m.phone, m.kakaoId, m.createdAt)
        }
    }

    @Test
    fun `편지 한 통에 우표 1장을 쓴다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false
        every { memberQueryService.findProfile(senderId) } returns sender()
        stubSaved()

        service.send(senderId, peerAnswerId, "만나서 반가웠어요", includePhone = true, kakaoId = null)

        verify(exactly = 1) { stampService.spendOne(senderId, StampService.REASON_MAIL) }
    }

    @Test
    fun `카카오톡 ID만 실어도 보내진다 - 우표는 똑같이 쓴다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false
        stubSaved()

        val result = service.send(senderId, peerAnswerId, "안녕하세요", includePhone = false, kakaoId = "kakao_id")

        assertEquals(36, result.mailId.toString().length)
        verify(exactly = 1) { stampService.spendOne(senderId, StampService.REASON_MAIL) }
    }

    @Test
    fun `전화번호 포함인데 프로필에 없으면 예외`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false
        every { memberQueryService.findProfile(senderId) } returns sender(phone = null)

        assertFailsWith<DailyMeetException> {
            service.send(senderId, peerAnswerId, "안녕하세요", includePhone = true, kakaoId = null)
        }
    }

    @Test
    fun `연락처를 하나도 싣지 않으면 예외`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false

        assertFailsWith<DailyMeetException> {
            service.send(senderId, peerAnswerId, "안녕하세요", includePhone = false, kakaoId = "  ")
        }
    }

    @Test
    fun `같은 상대에게 두 번은 보낼 수 없다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns true

        assertFailsWith<DailyMeetException> {
            service.send(senderId, peerAnswerId, "또 인사드려요", includePhone = true, kakaoId = null)
        }
    }

    @Test
    fun `받은 편지에 답장하면 원본 발신인에게 우표 1장으로 보내진다`() {
        val mailId = UUID.randomUUID()
        val original = Mail.reconstitute(mailId, recipientId, senderId, "먼저 보낸 편지", "01099998888", null, Instant.now())
        every { mailRepository.findById(mailId) } returns original
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false
        every { memberQueryService.findProfile(senderId) } returns sender()
        stubSaved()

        service.reply(senderId, mailId, "답장이에요", includePhone = true, kakaoId = null)

        verify(exactly = 1) { stampService.spendOne(senderId, StampService.REASON_MAIL) }
    }

    @Test
    fun `내가 받은 편지가 아니면 답장할 수 없다`() {
        val mailId = UUID.randomUUID()
        val othersMail = Mail.reconstitute(mailId, recipientId, UUID.randomUUID(), "남의 편지", "01000000000", null, Instant.now())
        every { mailRepository.findById(mailId) } returns othersMail

        assertFailsWith<DailyMeetException> {
            service.reply(senderId, mailId, "답장이에요", includePhone = true, kakaoId = null)
        }
    }

    @Test
    fun `받은 편지에는 보낸 사람 요약과 연락처가 실린다`() {
        val mail = Mail.reconstitute(UUID.randomUUID(), senderId, recipientId, "연락 주세요", "01012345678", null, Instant.now())
        every { mailRepository.findAllByRecipient(recipientId) } returns listOf(mail)
        every { memberQueryService.findProfile(senderId) } returns sender()

        val views = service.received(recipientId)

        assertEquals(1, views.size)
        assertEquals("발신인", views[0].nickname)
        assertEquals("연락 주세요", views[0].content)
        assertEquals("01012345678", views[0].phone)
        assertNull(views[0].kakaoId)
    }
}
