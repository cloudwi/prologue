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
import java.time.LocalDate
import java.time.LocalTime
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
    private val profileLetterService = mockk<ProfileLetterService> {
        every { lettersOf(any()) } returns emptyList()
    }
    private val service = DailyMeetService(questionRepository, answerRepository, dailyRevealRepository, memberQueryService, profileLetterService)

    private val accountId = UUID.randomUUID()
    // 질문 1개면 날짜와 무관하게 항상 그 질문이 선택됨 → 결정적 테스트
    private val question = Question(1L, "요즘 가장 마음 쓰는 일은?")

    private fun member(id: UUID, gender: Gender, prefers: Gender): Member =
        Member.reconstitute(id, "닉", gender, LocalDate.of(1995, 5, 14), prefers, "서울특별시 강남구", Instant.now())

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
    fun `오늘의 상대 - 정오 전에는 공개되지 않는다`() {
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null

        val view = service.todayPeers(accountId, now = LocalTime.of(11, 59))

        assertFalse(view.open)
        assertTrue(view.peers.isEmpty())
    }

    @Test
    fun `오늘의 상대 - 답 안 했어도 프로필은 보이되 답변은 잠긴다`() {
        val peerAccount = UUID.randomUUID()
        val peerAnswer = Answer.reconstitute(UUID.randomUUID(), peerAccount, 1L, "상대 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null // 미답변
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthers(1L, accountId) } returns listOf(peerAnswer)
        every { memberQueryService.findProfile(peerAccount) } returns member(peerAccount, Gender.FEMALE, Gender.MALE)
        every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, peerAnswer.id!!) } returns 0

        val view = service.todayPeers(accountId, now = NOON)

        assertTrue(view.open)
        assertEquals(1, view.peers.size)
        assertFalse(view.answerUnlocked)
        assertNull(view.peers[0].peerAnswer) // 답변은 Give&Take로 잠김
        assertEquals(Gender.FEMALE, view.peers[0].gender) // 프로필은 미리 보임
    }

    @Test
    fun `오늘의 상대 - 후보가 여럿이어도 한 명만 공개하고 고정 저장`() {
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val peers = (1..4).map { Answer.reconstitute(UUID.randomUUID(), UUID.randomUUID(), 1L, "상대 답변 $it", Instant.now()) }
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthers(1L, accountId) } returns peers
        peers.forEach {
            every { memberQueryService.findProfile(it.accountId) } returns member(it.accountId, Gender.FEMALE, Gender.MALE)
            every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, it.id!!) } returns 0
        }
        val saved = mutableListOf<DailyReveal>()
        every { dailyRevealRepository.save(capture(saved)) } answers { saved.last() }

        val view = service.todayPeers(accountId, now = NOON)

        assertTrue(view.open)
        assertEquals(1, view.peers.size)
        assertEquals(1, saved.size)
        assertTrue(view.answerUnlocked)
        assertEquals(1, view.peers.mapNotNull { it.peerAnswer }.size)
    }

    @Test
    fun `오늘의 상대 - 선호 일치 후보가 없으면 빈 목록`() {
        val sameGenderAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val otherAnswer = Answer.reconstitute(UUID.randomUUID(), sameGenderAccount, 1L, "동성 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthers(1L, accountId) } returns listOf(otherAnswer)
        // 후보가 남성(내가 선호하는 여성이 아님) → 제외
        every { memberQueryService.findProfile(sameGenderAccount) } returns member(sameGenderAccount, Gender.MALE, Gender.FEMALE)

        val view = service.todayPeers(accountId, now = NOON)

        assertTrue(view.open)
        assertTrue(view.peers.isEmpty())
    }

    @Test
    fun `오늘의 상대 - 이미 공개된 상대가 있으면 그대로 유지하고 더 채우지 않는다`() {
        val pinnedAnswerId = UUID.randomUUID()
        val pinnedAccount = UUID.randomUUID()
        val newAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val pinnedAnswer = Answer.reconstitute(pinnedAnswerId, pinnedAccount, 1L, "고정된 상대", Instant.now())
        val newAnswer = Answer.reconstitute(UUID.randomUUID(), newAccount, 1L, "새 상대", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns
            listOf(DailyReveal.reconstitute(UUID.randomUUID(), accountId, 1L, pinnedAnswerId, Instant.now()))
        every { answerRepository.findById(pinnedAnswerId) } returns pinnedAnswer
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthers(1L, accountId) } returns listOf(pinnedAnswer, newAnswer)
        every { memberQueryService.findProfile(pinnedAccount) } returns member(pinnedAccount, Gender.FEMALE, Gender.MALE)
        every { memberQueryService.findProfile(newAccount) } returns member(newAccount, Gender.FEMALE, Gender.MALE)
        every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, newAnswer.id!!) } returns 0
        val saved = mutableListOf<DailyReveal>()
        every { dailyRevealRepository.save(capture(saved)) } answers { saved.last() }

        val view = service.todayPeers(accountId, now = NOON)

        // 하루 한 사람 — 고정된 상대만 유지하고 새로 채우지 않는다
        assertEquals(1, view.peers.size)
        assertEquals("고정된 상대", view.peers[0].peerAnswer)
        assertEquals(0, saved.size)
    }

    companion object {
        private val NOON = LocalTime.NOON
    }
}
