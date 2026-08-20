package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.model.MailStatus
import com.prologue.backend.dailymeet.domain.model.Report
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.dailymeet.domain.repository.ReportRepository
import com.prologue.backend.member.application.service.MemberQueryService
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ReportServiceTest {

    private val answerRepository = mockk<AnswerRepository>()
    private val mailRepository = mockk<MailRepository>()
    private val reportRepository = mockk<ReportRepository>()
    private val memberQueryService = mockk<MemberQueryService>()
    private val accountModerationService = mockk<com.prologue.backend.auth.application.service.AccountModerationService>(relaxed = true)
    private val profileLetterRepository = mockk<com.prologue.backend.dailymeet.domain.repository.ProfileLetterRepository> {
        every { findAllByAccountId(any()) } returns emptyList()
    }
    private val service = ReportService(answerRepository, mailRepository, reportRepository, memberQueryService, accountModerationService, profileLetterRepository)

    private val me = UUID.randomUUID()
    private val other = UUID.randomUUID()

    @Test
    fun `답변 신고 - 답의 주인이 신고 대상이 되고 스냅샷이 남는다`() {
        val answerId = UUID.randomUUID()
        every { answerRepository.findById(answerId) } returns
            Answer.reconstitute(answerId, other, 1L, "문제의 답변", Instant.now())
        every { memberQueryService.findProfile(other) } returns null
        val saved = slot<Report>()
        every { reportRepository.save(capture(saved)) } answers { saved.captured }

        service.reportAnswer(me, answerId, "ABUSE")

        assertEquals(other, saved.captured.reportedAccountId)
        assertEquals("[답변] 문제의 답변", saved.captured.snapshot)
        assertEquals(Report.CONTEXT_ANSWER, saved.captured.context)
    }

    @Test
    fun `편지 신고 - 내가 받은 편지만 신고할 수 있다`() {
        val mailId = UUID.randomUUID()
        every { mailRepository.findById(mailId) } returns
            Mail.reconstitute(mailId, other, UUID.randomUUID(), "남의 편지", "01000000000", null, 50, MailStatus.OPENED, Instant.now())

        assertFailsWith<DailyMeetException> { service.reportMail(me, mailId, "SPAM") }
    }

    @Test
    fun `모르는 신고 사유는 거절한다`() {
        val answerId = UUID.randomUUID()
        every { answerRepository.findById(answerId) } returns
            Answer.reconstitute(answerId, other, 1L, "답변", Instant.now())
        every { memberQueryService.findProfile(other) } returns null

        assertFailsWith<DailyMeetException> { service.reportAnswer(me, answerId, "WHATEVER") }
    }
}
