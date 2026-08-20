package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DailyAnswerServiceTest {

    private val questionRepository = mockk<QuestionRepository>()
    private val answerRepository = mockk<AnswerRepository>()
    private val inkService = mockk<InkService> { every { rewardDailyAnswer(any()) } returns 0 }
    private val service = DailyAnswerService(questionRepository, answerRepository, inkService)

    private val accountId = UUID.randomUUID()
    // 질문 1개면 날짜와 무관하게 항상 그 질문이 선택됨 → 결정적 테스트
    private val question = Question(1L, "요즘 가장 마음 쓰는 일은?")

    @Test
    fun `오늘 - 아직 답 안 함`() {
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null

        val view = service.today(accountId)

        assertEquals(1L, view.questionId)
        assertFalse(view.answered)
        assertNull(view.myAnswer)
    }

    @Test
    fun `오늘 - 답한 경우 내 답변 포함`() {
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine

        val view = service.today(accountId)

        assertTrue(view.answered)
        assertEquals("내 답변", view.myAnswer)
    }

    @Test
    fun `답변 최초 작성 시 trim 되어 저장된다`() {
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null
        val saved = slot<Answer>()
        every { answerRepository.save(capture(saved)) } answers { saved.captured }

        val result = service.answerToday(accountId, "  나의 답변은 열다섯 자를 넘겨 쓴다  ")

        assertEquals("나의 답변은 열다섯 자를 넘겨 쓴다", result.answer.content)
        assertEquals(1L, result.answer.questionId)
    }

    @Test
    fun `답변을 저장하면 오늘의 답변 잉크가 함께 돌아온다`() {
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null
        every { answerRepository.save(any()) } answers { firstArg() }
        every { inkService.rewardDailyAnswer(accountId) } returns 2

        val result = service.answerToday(accountId, "오늘의 답은 이만큼 길게 적어 본다")

        assertEquals(2, result.inkEarned)
        verify(exactly = 1) { inkService.rewardDailyAnswer(accountId) }
    }

    @Test
    fun `답변이 검증에 막히면 잉크도 주지 않는다`() {
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null

        assertFailsWith<DailyMeetException> { service.answerToday(accountId, "   ") }
        verify(exactly = 0) { inkService.rewardDailyAnswer(any()) }
    }

    @Test
    fun `이미 답했으면 수정된다`() {
        val existing = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "옛 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns existing
        every { answerRepository.save(any()) } answers { firstArg() }

        val result = service.answerToday(accountId, "새로 고쳐 쓴 답변은 이만큼 길다")

        assertEquals("새로 고쳐 쓴 답변은 이만큼 길다", result.answer.content)
    }

    @Test
    fun `내가 남긴 답 - 질문을 붙여 저장소가 준 최신순 그대로 돌려준다`() {
        val old = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "첫날의 답", Instant.parse("2026-08-01T03:00:00Z"))
        val recent = Answer.reconstitute(UUID.randomUUID(), accountId, 2L, "둘째 날의 답", Instant.parse("2026-08-02T03:00:00Z"))
        every { questionRepository.findAllOrdered() } returns listOf(question, Question(2L, "두 번째 질문"))
        every { answerRepository.findAllByAccountId(accountId) } returns listOf(recent, old)

        val views = service.myAnswers(accountId)

        assertEquals(2, views.size)
        assertEquals("두 번째 질문", views[0].question)
        assertEquals("둘째 날의 답", views[0].content)
        assertEquals(question.content, views[1].question)
        assertEquals("첫날의 답", views[1].content)
    }

    @Test
    fun `질문 풀이 비어있으면 예외`() {
        every { questionRepository.findAllOrdered() } returns emptyList()

        assertFailsWith<DailyMeetException> { service.today(accountId) }
    }
}
