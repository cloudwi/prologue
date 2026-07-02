package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.DailyReveal
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
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
    private val dailyRevealRepository = mockk<DailyRevealRepository>(relaxed = true)
    private val memberQueryService = mockk<MemberQueryService>()
    private val service = DailyMeetService(questionRepository, answerRepository, dailyRevealRepository, memberQueryService)

    private val accountId = UUID.randomUUID()
    // 질문 1개면 날짜와 무관하게 항상 그 질문이 선택됨 → 결정적 테스트
    private val question = Question(1L, "요즘 가장 마음 쓰는 일은?")

    private fun member(id: UUID, gender: Gender, prefers: Gender): Member =
        Member.reconstitute(id, "닉", gender, 1995, prefers, "서울특별시 강남구", Instant.now())

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
    fun `상대 답변 - 선호 일치 후보가 있으면 상대 답변 반환 및 고정 저장`() {
        val peerAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val peerAnswer = Answer.reconstitute(UUID.randomUUID(), peerAccount, 1L, "상대 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findByViewerAndQuestion(accountId, 1L) } returns null
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthers(1L, accountId) } returns listOf(peerAnswer)
        every { memberQueryService.findProfile(peerAccount) } returns member(peerAccount, Gender.FEMALE, Gender.MALE)
        every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, peerAnswer.id!!) } returns 0

        val saved = slot<DailyReveal>()
        every { dailyRevealRepository.save(capture(saved)) } answers { saved.captured }

        val view = service.peerAnswer(accountId)

        assertTrue(view.hasPeer)
        assertEquals("상대 답변", view.peerAnswer)
        assertEquals(peerAnswer.id, saved.captured.peerAnswerId)
    }

    @Test
    fun `상대 답변 - 선호 일치 후보가 없으면 hasPeer false`() {
        val sameGenderAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val otherAnswer = Answer.reconstitute(UUID.randomUUID(), sameGenderAccount, 1L, "동성 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findByViewerAndQuestion(accountId, 1L) } returns null
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthers(1L, accountId) } returns listOf(otherAnswer)
        // 후보가 남성(내가 선호하는 여성이 아님) → 제외
        every { memberQueryService.findProfile(sameGenderAccount) } returns member(sameGenderAccount, Gender.MALE, Gender.FEMALE)

        val view = service.peerAnswer(accountId)

        assertFalse(view.hasPeer)
        assertNull(view.peerAnswer)
    }

    @Test
    fun `상대 답변 - 이미 본 상대가 있으면 고정된 상대를 반환`() {
        val peerAnswerId = UUID.randomUUID()
        val peerAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val peerAnswer = Answer.reconstitute(peerAnswerId, peerAccount, 1L, "고정된 상대", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findByViewerAndQuestion(accountId, 1L) } returns
            DailyReveal.reconstitute(UUID.randomUUID(), accountId, 1L, peerAnswerId, Instant.now())
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { memberQueryService.findProfile(peerAccount) } returns member(peerAccount, Gender.FEMALE, Gender.MALE)

        val view = service.peerAnswer(accountId)

        assertTrue(view.hasPeer)
        assertEquals("고정된 상대", view.peerAnswer)
        assertEquals(Gender.FEMALE, view.gender)
    }
}
