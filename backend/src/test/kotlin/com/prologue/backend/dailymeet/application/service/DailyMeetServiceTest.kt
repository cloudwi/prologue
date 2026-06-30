package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DailyMeetServiceTest {

    private val questionRepository = mockk<QuestionRepository>()
    private val answerRepository = mockk<AnswerRepository>()
    private val service = DailyMeetService(questionRepository, answerRepository)

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

        val result = service.answerToday(accountId, "  나의 답변  ")

        assertEquals("나의 답변", result.content)
        assertEquals(1L, result.questionId)
    }

    @Test
    fun `이미 답했으면 수정된다`() {
        val existing = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "옛 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns existing
        every { answerRepository.save(any()) } answers { firstArg() }

        val result = service.answerToday(accountId, "새 답변")

        assertEquals("새 답변", result.content)
    }

    @Test
    fun `질문 풀이 비어있으면 예외`() {
        every { questionRepository.findAllOrdered() } returns emptyList()

        assertFailsWith<DailyMeetException> { service.today(accountId) }
    }

    @Test
    fun `상대 답변 - 내가 답 안 했으면 예외`() {
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null

        assertFailsWith<DailyMeetException> { service.peerAnswer(accountId) }
    }

    @Test
    fun `상대 답변 - 답했고 상대가 있으면 상대 답변 반환`() {
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val peer = Answer.reconstitute(UUID.randomUUID(), UUID.randomUUID(), 1L, "상대 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { answerRepository.findOtherAnswer(1L, accountId) } returns peer

        val view = service.peerAnswer(accountId)

        assertTrue(view.hasPeer)
        assertEquals("상대 답변", view.peerAnswer)
    }

    @Test
    fun `상대 답변 - 답했지만 상대가 없으면 hasPeer false`() {
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { answerRepository.findOtherAnswer(1L, accountId) } returns null

        val view = service.peerAnswer(accountId)

        assertFalse(view.hasPeer)
        assertNull(view.peerAnswer)
    }
}
