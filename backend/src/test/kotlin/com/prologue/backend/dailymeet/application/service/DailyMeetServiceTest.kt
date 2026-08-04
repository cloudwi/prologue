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
import java.time.ZoneId
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
    fun `오늘의 상대 - 후보가 여럿이어도 두 명만 공개하고 고정 저장`() {
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
        assertEquals(2, view.peers.size)
        assertEquals(2, saved.size)
        assertTrue(view.answerUnlocked)
        assertEquals(2, view.peers.mapNotNull { it.peerAnswer }.size)
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
    fun `오늘의 상대 - 이미 공개된 상대는 유지하고 부족분만 채운다`() {
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

        // 고정된 상대는 그대로, 정원(2)까지 부족분은 새 후보로 채운다
        assertEquals(2, view.peers.size)
        assertEquals("고정된 상대", view.peers[0].peerAnswer)
        assertEquals("새 상대", view.peers[1].peerAnswer)
        assertEquals(1, saved.size)
    }

    @Test
    fun `지난 상대 - 3일 창 안의 공개 기록을 돌려주되 오늘 질문 분은 뺀다`() {
        // 질문 풀이 [1,2]면 오늘은 그중 하나 — 두 질문 모두의 공개 기록을 넣으면 오늘 것만 빠져 1건이 남는다
        val q2 = Question(2L, "어제의 질문")
        val peerAccount = UUID.randomUUID()
        val pastAnswer = Answer.reconstitute(UUID.randomUUID(), peerAccount, 2L, "어제의 답", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question, q2)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, any()) } returns null // 내 답 없음
        every { dailyRevealRepository.findRecentByViewer(accountId, any()) } returns listOf(
            DailyReveal.reconstitute(UUID.randomUUID(), accountId, 1L, UUID.randomUUID(), Instant.now()),
            DailyReveal.reconstitute(UUID.randomUUID(), accountId, 2L, pastAnswer.id!!, Instant.now()),
        )
        every { answerRepository.findById(any()) } returns pastAnswer
        every { memberQueryService.findProfile(peerAccount) } returns member(peerAccount, Gender.FEMALE, Gender.MALE)

        val result = service.pastPeers(accountId)

        assertEquals(1, result.size)
        assertNull(result[0].peer.peerAnswer) // 그날 내가 답하지 않았으면 잠김 그대로
    }

    @Test
    fun `지난 상대 - 같은 상대가 여러 날 공개되면 한 명으로 묶여 문답이 쌓인다`() {
        every { questionRepository.findAllOrdered() } returns
            listOf(Question(1L, "질문 하나"), Question(2L, "질문 둘"), Question(3L, "질문 셋"))
        // 오늘의 질문은 날짜로 결정되므로, 오늘이 아닌 두 질문을 골라 지난 공개로 쓴다
        val todayId = LocalDate.now(ZoneId.of("Asia/Seoul")).toEpochDay() % 3 + 1
        val (lockedQid, openQid) = listOf(1L, 2L, 3L).filter { it != todayId }

        val peerAccount = UUID.randomUUID()
        val lockedAnswer = Answer.reconstitute(UUID.randomUUID(), peerAccount, lockedQid, "잠긴 답", Instant.now())
        val openAnswer = Answer.reconstitute(UUID.randomUUID(), peerAccount, openQid, "열린 답", Instant.now())
        every { dailyRevealRepository.findRecentByViewer(accountId, any()) } returns listOf(
            // 최신 공개 — 그날 나는 답하지 않았다
            DailyReveal.reconstitute(UUID.randomUUID(), accountId, lockedQid, lockedAnswer.id!!, Instant.now()),
            // 하루 전 공개 — 그날 나는 답했다
            DailyReveal.reconstitute(UUID.randomUUID(), accountId, openQid, openAnswer.id!!, Instant.now().minusSeconds(86_400)),
        )
        every { answerRepository.findById(lockedAnswer.id) } returns lockedAnswer
        every { answerRepository.findById(openAnswer.id) } returns openAnswer
        every { answerRepository.findByAccountIdAndQuestionId(accountId, lockedQid) } returns null
        every { answerRepository.findByAccountIdAndQuestionId(accountId, openQid) } returns
            Answer.reconstitute(UUID.randomUUID(), accountId, openQid, "내 답", Instant.now())
        every { memberQueryService.findProfile(peerAccount) } returns member(peerAccount, Gender.FEMALE, Gender.MALE)

        val result = service.pastPeers(accountId)

        assertEquals(1, result.size) // 두 번 공개됐지만 카드는 한 사람
        val view = result[0]
        assertEquals(2, view.answers.size)
        assertFalse(view.answers[0].unlocked) // 최신 공개분 — Give&Take로 잠김
        assertNull(view.answers[0].content)
        assertTrue(view.answers[1].unlocked)
        assertEquals("열린 답", view.answers[1].content)
        // 행동(하트·대화 신청)은 열려 있는 답변에 걸린다 — 최신이 잠겨 있어도 인연은 살아 있다
        assertTrue(view.peer.answerUnlocked)
        assertEquals(openAnswer.id, view.peer.peerAnswerId)
    }

    companion object {
        private val NOON = LocalTime.NOON
    }
}
