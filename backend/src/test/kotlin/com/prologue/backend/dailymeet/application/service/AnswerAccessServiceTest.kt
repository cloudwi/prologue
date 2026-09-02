package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.AnswerUnlock
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.AnswerUnlockRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AnswerAccessServiceTest {

    private val questionRepository = mockk<QuestionRepository> {
        every { findAllOrdered() } returns listOf(Question(1L, "요즘 가장 마음 쓰는 일은?"))
    }
    private val answerRepository = mockk<AnswerRepository>()
    private val answerUnlockRepository = mockk<AnswerUnlockRepository>()
    private val inkService = mockk<InkService>(relaxed = true) {
        every { balance(any()) } returns 100
    }
    private val service = AnswerAccessService(questionRepository, answerRepository, answerUnlockRepository, inkService)

    private val accountId = UUID.randomUUID()

    @Test
    fun `답하지 않은 날은 잉크를 내면 열린다`() {
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null
        every { answerUnlockRepository.saveIfNew(any<AnswerUnlock>()) } returns true

        val result = service.unlock(accountId, 1L)

        assertTrue(result.spent)
        verify(exactly = 1) { inkService.spend(accountId, InkPrice.ANSWER_UNLOCK, InkService.REASON_ANSWER_UNLOCK) }
    }

    @Test
    fun `이미 답한 날은 잉크를 받지 않는다`() {
        // 지금 공짜로 읽을 수 있는 것을 받고 파는 건 값을 받는 게 아니라 속이는 것이다.
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns
            Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답", Instant.now())

        val result = service.unlock(accountId, 1L)

        assertFalse(result.spent)
        verify(exactly = 0) { inkService.spend(any(), any(), any()) }
        verify(exactly = 0) { answerUnlockRepository.saveIfNew(any()) }
    }

    @Test
    fun `이미 산 날은 두 번 받지 않는다`() {
        // 버튼이 두 번 눌리거나 앱이 재시도해도 잉크는 한 번만 나간다 — 판정은 유니크 제약이 한다.
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null
        every { answerUnlockRepository.saveIfNew(any<AnswerUnlock>()) } returns false

        val result = service.unlock(accountId, 1L)

        assertFalse(result.spent)
        verify(exactly = 0) { inkService.spend(any(), any(), any()) }
    }

    @Test
    fun `없는 질문은 살 수 없다`() {
        assertFailsWith<DailyMeetException> { service.unlock(accountId, 99L) }
    }

    @Test
    fun `열람권 값은 답변 보상보다 무겁다`() {
        // 쓰면 고이고 안 쓰면 나간다 — 이 차이가 사라지면 아무도 쓰지 않고, 그러면 살 답도 없어진다.
        assertTrue(InkPrice.ANSWER_UNLOCK > InkPrice.DAILY_ANSWER)
        assertTrue(InkPrice.ANSWER_UNLOCK < InkPrice.PROFILE_UNLOCK)
    }
}
