package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.model.MailStatus
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
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
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MailServiceTest {

    private val answerRepository = mockk<AnswerRepository>()
    private val mailRepository = mockk<MailRepository>()
    // 기본은 하트가 오간 적 없는 사이 — 상호 하트 테스트에서만 덮어쓴다.
    private val heartRepository = mockk<HeartRepository> { every { existsFromTo(any(), any()) } returns false }
    private val memberQueryService = mockk<MemberQueryService>()
    private val inkService = mockk<InkService>(relaxed = true)
    private val notificationService = mockk<com.prologue.backend.notification.application.service.NotificationService>(relaxed = true)
    private val service = MailService(answerRepository, mailRepository, heartRepository, memberQueryService, inkService, notificationService)

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
            Mail.reconstitute(m.id ?: UUID.randomUUID(), m.senderAccountId, m.recipientAccountId, m.content, m.phone, m.kakaoId, m.inkPaid, m.status, m.createdAt)
        }
    }

    private fun mailOf(
        id: UUID,
        sender: UUID,
        recipient: UUID,
        status: MailStatus = MailStatus.OPENED,
        inkPaid: Int = InkPrice.MAIL,
        createdAt: Instant = Instant.now(),
    ): Mail = Mail.reconstitute(id, sender, recipient, "연락 주세요", "01012345678", null, inkPaid, status, createdAt)

    private fun mutualHearts() {
        every { heartRepository.existsFromTo(senderId, recipientId) } returns true
        every { heartRepository.existsFromTo(recipientId, senderId) } returns true
    }

    @Test
    fun `편지 한 통에 잉크 1장을 쓴다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false
        every { memberQueryService.findProfile(senderId) } returns sender()
        stubSaved()

        service.send(senderId, peerAnswerId, "만나서 반가웠어요", includePhone = true, kakaoId = null)

        verify(exactly = 1) { inkService.spend(senderId, InkPrice.MAIL, InkService.REASON_MAIL) }
    }

    @Test
    fun `서로 하트를 주고받은 상대에게는 30% 할인가로 부쳐지고 편지에 낸 값이 남는다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false
        every { memberQueryService.findProfile(senderId) } returns sender()
        mutualHearts()
        val saved = slot<Mail>()
        every { mailRepository.save(capture(saved)) } answers {
            val m = saved.captured
            Mail.reconstitute(UUID.randomUUID(), m.senderAccountId, m.recipientAccountId, m.content, m.phone, m.kakaoId, m.inkPaid, m.status, m.createdAt)
        }

        val result = service.send(senderId, peerAnswerId, "마음이 통했네요", includePhone = true, kakaoId = null)

        assertEquals(InkPrice.MAIL_MUTUAL, result.inkSpent)
        assertEquals(InkPrice.MAIL_MUTUAL, saved.captured.inkPaid)
        verify(exactly = 1) { inkService.spend(senderId, InkPrice.MAIL_MUTUAL, InkService.REASON_MAIL) }
    }

    @Test
    fun `한쪽만 하트를 보낸 사이는 정가다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.existsFromTo(senderId, recipientId) } returns true

        val quote = service.quoteFor(senderId, peerAnswerId)

        assertEquals(InkPrice.MAIL, quote.price)
        assertFalse(quote.mutual)
    }

    @Test
    fun `견적 - 상호 하트면 할인가와 함께 mutual=true`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        mutualHearts()

        val quote = service.quoteFor(senderId, peerAnswerId)

        assertEquals(InkPrice.MAIL_MUTUAL, quote.price)
        assertTrue(quote.mutual)
    }

    @Test
    fun `답장 견적 - 내가 받은 편지가 아니면 예외`() {
        val mailId = UUID.randomUUID()
        every { mailRepository.findById(mailId) } returns mailOf(mailId, recipientId, UUID.randomUUID())

        assertFailsWith<DailyMeetException> { service.quoteForReply(senderId, mailId) }
    }

    @Test
    fun `회수 환급은 정가가 아니라 그 편지에 낸 값의 절반이다`() {
        val mailId = UUID.randomUUID()
        val fourDaysAgo = Instant.now().minus(java.time.Duration.ofDays(4))
        every { mailRepository.findById(mailId) } returns
            mailOf(mailId, senderId, recipientId, MailStatus.PENDING, inkPaid = InkPrice.MAIL_MUTUAL, createdAt = fourDaysAgo)
        every { mailRepository.save(any()) } answers { firstArg() }

        service.recall(senderId, mailId)

        verify(exactly = 1) { inkService.grantTo(senderId, InkPrice.MAIL_MUTUAL / 2, InkService.REASON_MAIL_RECALL) }
    }

    @Test
    fun `카카오톡 ID만 실어도 보내진다 - 잉크는 똑같이 쓴다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false
        stubSaved()

        val result = service.send(senderId, peerAnswerId, "안녕하세요", includePhone = false, kakaoId = "kakao_id")

        assertEquals(36, result.mailId.toString().length)
        verify(exactly = 1) { inkService.spend(senderId, InkPrice.MAIL, InkService.REASON_MAIL) }
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
    fun `받은 편지에 답장하면 원본 발신인에게 잉크 1장으로 보내진다`() {
        val mailId = UUID.randomUUID()
        every { mailRepository.findById(mailId) } returns mailOf(mailId, recipientId, senderId)
        every { mailRepository.existsBySenderAndRecipient(senderId, recipientId) } returns false
        every { memberQueryService.findProfile(senderId) } returns sender()
        stubSaved()

        service.reply(senderId, mailId, "답장이에요", includePhone = true, kakaoId = null)

        verify(exactly = 1) { inkService.spend(senderId, InkPrice.MAIL, InkService.REASON_MAIL) }
    }

    @Test
    fun `내가 받은 편지가 아니면 답장할 수 없다`() {
        val mailId = UUID.randomUUID()
        every { mailRepository.findById(mailId) } returns mailOf(mailId, recipientId, UUID.randomUUID())

        assertFailsWith<DailyMeetException> {
            service.reply(senderId, mailId, "답장이에요", includePhone = true, kakaoId = null)
        }
    }

    @Test
    fun `봉투 상태의 편지는 요약만 보이고 내용과 연락처는 감춰진다`() {
        val mail = mailOf(UUID.randomUUID(), senderId, recipientId, MailStatus.PENDING)
        every { mailRepository.findAllByRecipient(recipientId) } returns listOf(mail)
        every { mailRepository.existsBySenderAndRecipient(recipientId, senderId) } returns false
        every { memberQueryService.findProfile(senderId) } returns sender()
        every { answerRepository.findAllByAccountId(senderId) } returns emptyList()

        val views = service.received(recipientId)

        assertEquals(MailStatus.PENDING, views[0].status)
        assertNull(views[0].content)
        assertNull(views[0].phone)
    }

    @Test
    fun `봉투를 열면 내용은 보이되 연락처는 답장 전이라 감춰진다`() {
        val mailId = UUID.randomUUID()
        every { mailRepository.findById(mailId) } returns mailOf(mailId, senderId, recipientId, MailStatus.PENDING)
        every { mailRepository.existsBySenderAndRecipient(recipientId, senderId) } returns false
        every { memberQueryService.findProfile(senderId) } returns sender()
        every { answerRepository.findAllByAccountId(senderId) } returns emptyList()
        stubSaved()

        val view = service.open(recipientId, mailId)

        assertEquals(MailStatus.OPENED, view.status)
        assertEquals("연락 주세요", view.content)
        assertNull(view.phone) // 연락처는 답장(내 연락처를 건네는 것)을 해야 열린다
    }

    @Test
    fun `답장한 뒤에는 상대의 연락처가 보인다`() {
        val mail = mailOf(UUID.randomUUID(), senderId, recipientId, MailStatus.OPENED)
        every { mailRepository.findAllByRecipient(recipientId) } returns listOf(mail)
        every { mailRepository.existsBySenderAndRecipient(recipientId, senderId) } returns true
        every { memberQueryService.findProfile(senderId) } returns sender()
        every { answerRepository.findAllByAccountId(senderId) } returns emptyList()

        val views = service.received(recipientId)

        assertEquals("01012345678", views[0].phone)
    }

    @Test
    fun `거절하면 받은 목록에 다시 올라오지 않는다 - 저장은 DECLINED로`() {
        val mailId = UUID.randomUUID()
        every { mailRepository.findById(mailId) } returns mailOf(mailId, senderId, recipientId, MailStatus.PENDING)
        val saved = slot<Mail>()
        every { mailRepository.save(capture(saved)) } answers { saved.captured }

        service.decline(recipientId, mailId)

        assertEquals(MailStatus.DECLINED, saved.captured.status)
    }

    @Test
    fun `이미 열어본 편지는 거절할 수 없다`() {
        val mailId = UUID.randomUUID()
        every { mailRepository.findById(mailId) } returns mailOf(mailId, senderId, recipientId, MailStatus.OPENED)

        assertFailsWith<DailyMeetException> { service.decline(recipientId, mailId) }
    }

    @Test
    fun `받은 편지에는 보낸 사람 요약과 연락처가 실린다`() {
        val mail = mailOf(UUID.randomUUID(), senderId, recipientId)
        val senderAnswerId = UUID.randomUUID()
        every { mailRepository.findAllByRecipient(recipientId) } returns listOf(mail)
        every { mailRepository.existsBySenderAndRecipient(recipientId, senderId) } returns true
        every { memberQueryService.findProfile(senderId) } returns sender()
        every { answerRepository.findAllByAccountId(senderId) } returns
            listOf(Answer.reconstitute(senderAnswerId, senderId, 1L, "보낸 사람의 답", Instant.now()))

        val views = service.received(recipientId)

        assertEquals(1, views.size)
        assertEquals("발신인", views[0].nickname)
        assertEquals("연락 주세요", views[0].content)
        assertEquals("01012345678", views[0].phone)
        assertEquals(senderAnswerId, views[0].peerAnswerId) // 프로필 상세로 들어갈 손잡이
        assertTrue(views[0].replied) // 이미 답장했으면 답장 버튼 대신 보낸 편지 확인
        assertNull(views[0].kakaoId)
    }
}
