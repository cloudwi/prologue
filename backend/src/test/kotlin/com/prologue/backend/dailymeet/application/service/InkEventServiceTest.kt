package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkEventSubmission
import com.prologue.backend.dailymeet.domain.repository.InkEventSubmissionRepository
import com.prologue.backend.member.application.service.MemberQueryService
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class InkEventServiceTest {

    private val submissionRepository = mockk<InkEventSubmissionRepository>()
    private val inkService = mockk<InkService>(relaxed = true)
    private val memberQueryService = mockk<MemberQueryService>()
    private val service = InkEventService(submissionRepository, inkService, memberQueryService)

    private val accountId = UUID.randomUUID()

    private fun pendingSubmission(id: UUID = UUID.randomUUID()): InkEventSubmission =
        InkEventSubmission.reconstitute(
            id, accountId, "https://blog.naver.com/review", InkEventSubmission.Status.PENDING, null, Instant.now(), null,
        )

    @Test
    fun `제출 - 링크가 http로 시작하지 않으면 예외`() {
        every { submissionRepository.existsPendingByAccountId(accountId) } returns false

        assertFailsWith<DailyMeetException> { service.submit(accountId, "blog.naver.com/review") }
    }

    @Test
    fun `제출 - 검토 중인 건이 있으면 막는다`() {
        every { submissionRepository.existsPendingByAccountId(accountId) } returns true

        assertFailsWith<DailyMeetException> { service.submit(accountId, "https://blog.naver.com/review") }
    }

    @Test
    fun `제출 - 성공하면 PENDING으로 저장된다`() {
        every { submissionRepository.existsPendingByAccountId(accountId) } returns false
        val saved = slot<InkEventSubmission>()
        every { submissionRepository.save(capture(saved)) } answers { saved.captured }
        every { submissionRepository.findByAccountId(accountId) } returns emptyList()

        service.submit(accountId, "  https://blog.naver.com/review  ")

        assertEquals("https://blog.naver.com/review", saved.captured.url) // trim
        assertEquals(InkEventSubmission.Status.PENDING, saved.captured.status)
    }

    @Test
    fun `승인 - 잉크를 지급하고 원장 사유는 EVENT`() {
        val submission = pendingSubmission()
        every { submissionRepository.findById(submission.id!!) } returns submission
        every { submissionRepository.save(any()) } answers { firstArg() }

        service.approve(submission.id!!, 5)

        assertEquals(InkEventSubmission.Status.APPROVED, submission.status)
        assertEquals(5, submission.grantedAmount)
        verify { inkService.grantTo(accountId, 5, InkService.REASON_EVENT) }
    }

    @Test
    fun `승인 - 이미 처리된 제출이면 지급 없이 예외`() {
        val done = InkEventSubmission.reconstitute(
            UUID.randomUUID(), accountId, "https://blog.naver.com/review",
            InkEventSubmission.Status.APPROVED, 5, Instant.now(), Instant.now(),
        )
        every { submissionRepository.findById(done.id!!) } returns done

        assertFailsWith<DailyMeetException> { service.approve(done.id!!, 5) }
        verify(exactly = 0) { inkService.grantTo(any(), any(), any()) }
    }

    @Test
    fun `반려 - 지급 없이 닫는다`() {
        val submission = pendingSubmission()
        every { submissionRepository.findById(submission.id!!) } returns submission
        every { submissionRepository.save(any()) } answers { firstArg() }

        service.reject(submission.id!!)

        assertEquals(InkEventSubmission.Status.REJECTED, submission.status)
        verify(exactly = 0) { inkService.grantTo(any(), any(), any()) }
    }
}
