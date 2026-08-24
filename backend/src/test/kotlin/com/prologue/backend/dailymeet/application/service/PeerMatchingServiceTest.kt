package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.DailyReveal
import com.prologue.backend.dailymeet.domain.model.ProfileAccess
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
import io.mockk.verify
import java.time.Duration
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

class PeerMatchingServiceTest {

    private val questionRepository = mockk<QuestionRepository>()
    // 넓힌 범위(30·90일)는 기본적으로 비어 있다 — 넓히는 동작을 보는 테스트에서만 채운다
    private val answerRepository = mockk<AnswerRepository> {
        every { findOthersAnsweredSince(any(), any()) } returns emptyList()
    }
    private val dailyRevealRepository = mockk<DailyRevealRepository>(relaxed = true)
    private val mailRepository = mockk<com.prologue.backend.dailymeet.domain.repository.MailRepository>(relaxed = true)
    private val heartRepository = mockk<com.prologue.backend.dailymeet.domain.repository.HeartRepository>(relaxed = true)
    private val memberQueryService = mockk<MemberQueryService>()
    private val profileLetterService = mockk<ProfileLetterService> {
        every { lettersOf(any()) } returns emptyList()
    }
    private val lastSeenService = mockk<com.prologue.backend.auth.application.service.LastSeenService> {
        every { lastSeenAt(any()) } returns null
    }
    // 기본은 "방금 이어졌고 잠긴 적 없음" — 잠금을 다루는 테스트에서만 시각을 되돌린다
    private val profileAccessService = mockk<ProfileAccessService> {
        every { unlockedPeers(any()) } returns emptySet()
        every { lastContactedAtByPeer(any()) } returns emptyMap()
        every { pairedAt(any(), any()) } returns Instant.now()
    }
    private val jobVerificationService = mockk<com.prologue.backend.member.application.service.JobVerificationService> {
        every { verifiedDomain(any()) } returns null
    }
    private val blockService = mockk<com.prologue.backend.member.application.service.BlockService> {
        every { exclusionFor(any(), any()) } returns com.prologue.backend.member.application.service.BlockService.Exclusion.NONE
    }
    private val service = PeerMatchingService(questionRepository, answerRepository, dailyRevealRepository, mailRepository, heartRepository, memberQueryService, profileLetterService, profileAccessService, lastSeenService, jobVerificationService, blockService)

    private val accountId = UUID.randomUUID()
    // 질문 1개면 날짜와 무관하게 항상 그 질문이 선택됨 → 결정적 테스트
    private val question = Question(1L, "요즘 가장 마음 쓰는 일은?")

    /** 사진 2장을 채운다 — 소개 노출 조건(Member.isVisibleToOthers)을 만족시키기 위해. */
    private fun member(id: UUID, gender: Gender, prefers: Gender, photos: List<String> = listOf("a.jpg", "b.jpg")): Member =
        Member.reconstitute(
            id, "닉", gender, LocalDate.of(1995, 5, 14), prefers, "서울특별시 강남구", Instant.now(),
            photoUrls = photos,
        )

    @Test
    fun `오늘의 상대 - 정오 전에는 공개되지 않는다`() {
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null

        val view = service.todayPeers(accountId, now = LocalTime.of(11, 59))

        assertFalse(view.open)
        assertTrue(view.peers.isEmpty())
    }

    @Test
    fun `오늘의 상대 - 내가 답하기 전에는 상대가 보이지 않는다`() {
        // Give&Take: 받기만 하는 사람은 없게 한다. 공개 기록도 남기지 않아야
        // 답하지 않은 사람 때문에 후보의 노출 몫이 줄지 않는다.
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns null // 미답변

        val view = service.todayPeers(accountId, now = NOON)

        assertTrue(view.open)
        assertFalse(view.answerUnlocked)
        assertTrue(view.peers.isEmpty())
        verify(exactly = 0) { dailyRevealRepository.save(any()) }
    }

    @Test
    fun `오늘의 상대 - 후보가 많아도 정해진 수만큼만 공개하고 고정 저장한다`() {
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val peers = (1..4).map { Answer.reconstitute(UUID.randomUUID(), UUID.randomUUID(), 1L, "상대 답변 $it", Instant.now()) }
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns peers
        peers.forEach {
            every { memberQueryService.findProfile(it.accountId) } returns member(it.accountId, Gender.FEMALE, Gender.MALE)
            every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, it.id!!) } returns 0
        }
        val saved = mutableListOf<DailyReveal>()
        every { dailyRevealRepository.save(capture(saved)) } answers { saved.last() }

        // 소개 인원은 설정값이라 테스트에서 2로 고정해 "넘치지 않는지"를 본다
        val twoPerDay = PeerMatchingService(
            questionRepository, answerRepository, dailyRevealRepository, mailRepository, heartRepository,
            memberQueryService, profileLetterService, profileAccessService, lastSeenService, jobVerificationService, blockService, revealCount = 2,
        )

        val view = twoPerDay.todayPeers(accountId, now = NOON)

        assertTrue(view.open)
        assertEquals(2, view.peers.size)
        assertEquals(2, saved.size)
        assertTrue(view.answerUnlocked)
        assertEquals(2, view.peers.mapNotNull { it.peerAnswer }.size)
    }

    @Test
    fun `오늘의 상대 - 기본값은 하루 한 명이다`() {
        // 유저가 적을 때 둘씩 태우면 후보 풀이 두 배로 빨리 마른다.
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val peers = (1..3).map { Answer.reconstitute(UUID.randomUUID(), UUID.randomUUID(), 1L, "상대 답변 $it", Instant.now()) }
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns peers
        peers.forEach {
            every { memberQueryService.findProfile(it.accountId) } returns member(it.accountId, Gender.FEMALE, Gender.MALE)
            every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, it.id!!) } returns 0
        }

        val view = service.todayPeers(accountId, now = NOON)

        assertEquals(1, view.peers.size)
    }

    @Test
    fun `오늘의 상대 - 차단된 상대는 후보가 되지 않는다`() {
        // 유일한 후보가 차단 대상이면 오늘은 아무도 없어야 한다 — 점수 이전에 걸러진다.
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val blocked = Answer.reconstitute(UUID.randomUUID(), UUID.randomUUID(), 1L, "차단된 상대 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(blocked)
        every { memberQueryService.findProfile(blocked.accountId) } returns member(blocked.accountId, Gender.FEMALE, Gender.MALE)
        every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, blocked.id!!) } returns 0
        every { blockService.exclusionFor(accountId, any()) } returns
            com.prologue.backend.member.application.service.BlockService.Exclusion(emptySet(), setOf(blocked.accountId)) { it }

        val view = service.todayPeers(accountId, now = NOON)

        assertTrue(view.peers.isEmpty())
        verify(exactly = 0) { dailyRevealRepository.save(any()) }
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
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(otherAnswer)
        // 후보가 남성(내가 선호하는 여성이 아님) → 제외
        every { memberQueryService.findProfile(sameGenderAccount) } returns member(sameGenderAccount, Gender.MALE, Gender.FEMALE)

        val view = service.todayPeers(accountId, now = NOON)

        assertTrue(view.open)
        assertTrue(view.peers.isEmpty())
    }

    @Test
    fun `오늘의 상대 - 한 번 이어진 사람은 어느 방향이었든 다시 소개하지 않는다`() {
        // 이미 지나간 인연이 다시 '오늘의 상대'로 오면 소개가 아니라 반복이 된다.
        // 답변이 아니라 사람 단위로 걸러야 한다 — 같은 사람이 다른 날 다른 답변으로 다시 오를 수 있어서.
        // 내가 본 상대든 나를 본 상대든 똑같이 걸러진다(findEverPairedAccountIds가 양쪽을 합쳐 준다).
        val metAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val newAnswerFromMetPerson = Answer.reconstitute(UUID.randomUUID(), metAccount, 1L, "다른 날의 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { dailyRevealRepository.findEverPairedAccountIds(accountId) } returns setOf(metAccount)
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(newAnswerFromMetPerson)
        every { memberQueryService.findProfile(metAccount) } returns member(metAccount, Gender.FEMALE, Gender.MALE)

        val view = service.todayPeers(accountId, now = NOON)

        assertTrue(view.open)
        assertTrue(view.peers.isEmpty())
    }

    @Test
    fun `오늘의 상대 - 사진이 부족한 후보는 소개하지 않는다`() {
        // MY 탭이 "사진이 있어야 상대에게 소개돼요"라고 안내한다 — 그 약속을 여기서 지킨다.
        val noPhotoAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val theirAnswer = Answer.reconstitute(UUID.randomUUID(), noPhotoAccount, 1L, "사진 없는 사람의 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(theirAnswer)
        // 선호는 맞지만 사진이 한 장뿐 → 제외
        every { memberQueryService.findProfile(noPhotoAccount) } returns
            member(noPhotoAccount, Gender.FEMALE, Gender.MALE, photos = listOf("only-one.jpg"))

        val view = service.todayPeers(accountId, now = NOON)

        assertTrue(view.open)
        assertTrue(view.peers.isEmpty())
    }

    @Test
    fun `오늘의 상대 - 오늘 상한만큼 소개된 사람은 후보가 그 사람뿐이어도 내보내지 않는다`() {
        // 성비가 기울면 적은 쪽에 노출이 몰린다. 점수의 공평 분배는 순서만 바꿀 뿐
        // 횟수를 막지 못해서, 후보가 하나면 몇 번이든 뽑힌다 — 그쪽이 먼저 지쳐 떠난다.
        val popularAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val theirAnswer = Answer.reconstitute(UUID.randomUUID(), popularAccount, 1L, "인기 있는 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(theirAnswer)
        every { memberQueryService.findProfile(popularAccount) } returns member(popularAccount, Gender.FEMALE, Gender.MALE)
        // 오늘 이미 3명에게 소개됨 = 기본 상한
        every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, theirAnswer.id!!) } returns 3

        val view = service.todayPeers(accountId, now = NOON)

        // 빈 화면은 손실이 아니라 정직함이다 — 한쪽을 갈아 넣어 채우는 것보다 낫다
        assertTrue(view.open)
        assertTrue(view.peers.isEmpty())
        verify(exactly = 0) { dailyRevealRepository.save(any()) }
    }

    @Test
    fun `오늘의 상대 - 상한에 아직 닿지 않은 사람은 소개된다`() {
        // 상한은 경계에서만 막아야 한다. 한 칸 남은 사람까지 걸러내면 매칭이 필요 이상으로 마른다.
        val popularAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val theirAnswer = Answer.reconstitute(UUID.randomUUID(), popularAccount, 1L, "인기 있는 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(theirAnswer)
        every { memberQueryService.findProfile(popularAccount) } returns member(popularAccount, Gender.FEMALE, Gender.MALE)
        every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, theirAnswer.id!!) } returns 2

        val view = service.todayPeers(accountId, now = NOON)

        assertEquals(1, view.peers.size)
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
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(pinnedAnswer, newAnswer)
        every { memberQueryService.findProfile(pinnedAccount) } returns member(pinnedAccount, Gender.FEMALE, Gender.MALE)
        every { memberQueryService.findProfile(newAccount) } returns member(newAccount, Gender.FEMALE, Gender.MALE)
        every { dailyRevealRepository.countByQuestionAndPeerAnswer(1L, newAnswer.id!!) } returns 0
        val saved = mutableListOf<DailyReveal>()
        every { dailyRevealRepository.save(capture(saved)) } answers { saved.last() }

        // 정원이 1이면 부족분이 없어 채울 일이 없다 — 2로 두고 "모자란 만큼만" 채우는지 본다
        val twoPerDay = PeerMatchingService(
            questionRepository, answerRepository, dailyRevealRepository, mailRepository, heartRepository,
            memberQueryService, profileLetterService, profileAccessService, lastSeenService, jobVerificationService, blockService, revealCount = 2,
        )

        val view = twoPerDay.todayPeers(accountId, now = NOON)

        // 고정된 상대는 그대로, 정원까지 부족분은 새 후보로 채운다
        assertEquals(2, view.peers.size)
        assertEquals("고정된 상대", view.peers[0].peerAnswer)
        assertEquals("새 상대", view.peers[1].peerAnswer)
        assertEquals(1, saved.size)
    }

    @Test
    fun `오늘의 상대 - 최근 질문에 답한 사람이 없으면 범위를 넓혀 최근에 답한 사람을 소개한다`() {
        // 사람이 적을 때 하루가 비지 않게 — 7일치 질문에 겹치는 사람이 없으면 30일 안에 답한 사람으로.
        val lateAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val oldAnswer = Answer.reconstitute(UUID.randomUUID(), lateAccount, 42L, "3주 전 답변", Instant.now().minus(Duration.ofDays(20)))
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns emptyList()
        val since = slot<Instant>()
        every { answerRepository.findOthersAnsweredSince(capture(since), accountId) } returns listOf(oldAnswer)
        every { memberQueryService.findProfile(lateAccount) } returns member(lateAccount, Gender.FEMALE, Gender.MALE)

        val view = service.todayPeers(accountId, now = NOON)

        assertEquals(1, view.peers.size)
        assertEquals("3주 전 답변", view.peers[0].peerAnswer)
        // 첫 번째 넓힌 범위(30일)부터 본다
        assertTrue(since.captured.isAfter(Instant.now().minus(Duration.ofDays(31))))
        assertTrue(since.captured.isBefore(Instant.now().minus(Duration.ofDays(29))))
    }

    @Test
    fun `오늘의 상대 - 같은 사람의 답이 여럿이면 가장 최근 답 하나로만 소개한다`() {
        val oneAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val older = Answer.reconstitute(UUID.randomUUID(), oneAccount, 2L, "오래된 답", Instant.now().minus(Duration.ofDays(5)))
        val newer = Answer.reconstitute(UUID.randomUUID(), oneAccount, 1L, "최근 답", Instant.now().minus(Duration.ofDays(1)))
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(older, newer)
        every { memberQueryService.findProfile(oneAccount) } returns member(oneAccount, Gender.FEMALE, Gender.MALE)
        val saved = mutableListOf<DailyReveal>()
        every { dailyRevealRepository.save(capture(saved)) } answers { saved.last() }

        val twoPerDay = PeerMatchingService(
            questionRepository, answerRepository, dailyRevealRepository, mailRepository, heartRepository,
            memberQueryService, profileLetterService, profileAccessService, lastSeenService, jobVerificationService, blockService, revealCount = 2,
        )
        val view = twoPerDay.todayPeers(accountId, now = NOON)

        // 둘을 뽑을 수 있어도 같은 사람은 한 번 — 그것도 최근 답으로
        assertEquals(1, view.peers.size)
        assertEquals("최근 답", view.peers[0].peerAnswer)
    }

    @Test
    fun `오늘의 상대 - 새 후보가 아무도 없으면 만났던 사람도 충분히 지났고 새 답이 있을 때만 다시 소개한다`() {
        val metAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val lastMet = Instant.now().minus(Duration.ofDays(20))
        val freshAnswer = Answer.reconstitute(UUID.randomUUID(), metAccount, 7L, "그 뒤의 새 답", lastMet.plus(Duration.ofDays(3)))
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { dailyRevealRepository.findEverPairedAccountIds(accountId) } returns setOf(metAccount)
        every { dailyRevealRepository.findLastRevealedAtBetween(accountId, metAccount) } returns lastMet
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns emptyList()
        every { answerRepository.findOthersAnsweredSince(any(), accountId) } returns listOf(freshAnswer)
        every { memberQueryService.findProfile(metAccount) } returns member(metAccount, Gender.FEMALE, Gender.MALE)

        val view = service.todayPeers(accountId, now = NOON)

        assertEquals(1, view.peers.size)
        assertEquals("그 뒤의 새 답", view.peers[0].peerAnswer)
    }

    @Test
    fun `오늘의 상대 - 만났던 사람은 간격이 짧거나 새 답이 없으면 다시 소개하지 않는다`() {
        val metAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { dailyRevealRepository.findEverPairedAccountIds(accountId) } returns setOf(metAccount)
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns emptyList()
        every { memberQueryService.findProfile(metAccount) } returns member(metAccount, Gender.FEMALE, Gender.MALE)

        // 1) 어제 만났는데 새 답이 있다 — 간격이 짧다
        every { dailyRevealRepository.findLastRevealedAtBetween(accountId, metAccount) } returns Instant.now().minus(Duration.ofDays(1))
        every { answerRepository.findOthersAnsweredSince(any(), accountId) } returns
            listOf(Answer.reconstitute(UUID.randomUUID(), metAccount, 7L, "새 답", Instant.now()))
        assertTrue(service.todayPeers(accountId, now = NOON).peers.isEmpty())

        // 2) 한참 전에 만났지만 그 뒤로 쓴 답이 없다 — 같은 카드의 반복
        val lastMet = Instant.now().minus(Duration.ofDays(30))
        every { dailyRevealRepository.findLastRevealedAtBetween(accountId, metAccount) } returns lastMet
        every { answerRepository.findOthersAnsweredSince(any(), accountId) } returns
            listOf(Answer.reconstitute(UUID.randomUUID(), metAccount, 7L, "옛 답", lastMet.minus(Duration.ofDays(2))))
        assertTrue(service.todayPeers(accountId, now = NOON).peers.isEmpty())
    }

    @Test
    fun `늦은 도착 - 정오 이후 빈자리가 새로 채워졌을 때만 true`() {
        val lateAccount = UUID.randomUUID()
        val mine = Answer.reconstitute(UUID.randomUUID(), accountId, 1L, "내 답변", Instant.now())
        val theirs = Answer.reconstitute(UUID.randomUUID(), lateAccount, 1L, "저녁에 남긴 답", Instant.now())
        every { questionRepository.findAllOrdered() } returns listOf(question)
        every { answerRepository.findByAccountIdAndQuestionId(accountId, 1L) } returns mine
        every { memberQueryService.findProfile(accountId) } returns member(accountId, Gender.MALE, Gender.FEMALE)
        every { memberQueryService.findProfile(lateAccount) } returns member(lateAccount, Gender.FEMALE, Gender.MALE)

        // 정오 전엔 손대지 않는다
        assertFalse(service.fillLateArrival(accountId, now = LocalTime.of(11, 0)))

        // 후보가 없으면 false
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns emptyList()
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns emptyList()
        assertFalse(service.fillLateArrival(accountId, now = LocalTime.of(15, 0)))

        // 후보가 생기면 채우고 true
        every { answerRepository.findOthersByQuestionIds(listOf(1L), accountId) } returns listOf(theirs)
        val saved = mutableListOf<DailyReveal>()
        every { dailyRevealRepository.save(capture(saved)) } answers { saved.last() }
        assertTrue(service.fillLateArrival(accountId, now = LocalTime.of(15, 0)))
        assertEquals(1, saved.size)

        // 이미 차 있으면 false — 같은 사람에게 두 번 알리지 않는다
        every { dailyRevealRepository.findAllByViewerAndQuestion(accountId, 1L) } returns
            listOf(DailyReveal.create(accountId, 1L, theirs.id!!))
        every { answerRepository.findById(theirs.id!!) } returns theirs
        assertFalse(service.fillLateArrival(accountId, now = LocalTime.of(16, 0)))
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

    /**
     * 잠금 테스트용 공통 설정 — 오늘이 아닌 질문에 사흘 넘게 지난 소개 하나.
     * 오늘의 질문은 날짜로 정해지므로, 질문 셋을 두고 오늘이 아닌 것을 골라야 결정적이다.
     */
    private fun stalePastPeer(peerAccount: UUID): Answer {
        val all = listOf(Question(1L, "질문 하나"), Question(2L, "질문 둘"), Question(3L, "질문 셋"))
        val todayId = LocalDate.now(ZoneId.of("Asia/Seoul")).toEpochDay() % 3 + 1
        val pastQid = listOf(1L, 2L, 3L).first { it != todayId }
        val pastAnswer = Answer.reconstitute(UUID.randomUUID(), peerAccount, pastQid, "지난 답", Instant.now())

        every { questionRepository.findAllOrdered() } returns all
        every { answerRepository.findByAccountIdAndQuestionId(accountId, any()) } returns
            Answer.reconstitute(UUID.randomUUID(), accountId, pastQid, "내 답", Instant.now())
        every { dailyRevealRepository.findRecentByViewer(accountId, any()) } returns listOf(
            DailyReveal.reconstitute(UUID.randomUUID(), accountId, pastQid, pastAnswer.id!!, STALE),
        )
        every { answerRepository.findById(pastAnswer.id) } returns pastAnswer
        every { memberQueryService.findProfile(peerAccount) } returns member(peerAccount, Gender.FEMALE, Gender.MALE)
        return pastAnswer
    }

    @Test
    fun `지난 상대 - 사흘이 지나면 프로필이 잠기고 문답도 함께 닫힌다`() {
        // 프로필만 가리고 답이 남으면 잠근 게 아니다 — 볼거리는 전부 닫혀야 잉크에 값이 생긴다.
        stalePastPeer(UUID.randomUUID())

        val view = service.pastPeers(accountId).single()

        assertTrue(view.peer.locked)
        assertTrue(view.peer.photoUrls.isEmpty())
        assertNull(view.peer.bio)
        // 내가 그날 답했더라도 창이 닫혔으면 문답은 잠긴다
        assertFalse(view.answers[0].unlocked)
        assertNull(view.answers[0].content)
        // 누구인지는 남는다 — 잉크를 쓸지 정하려면 알아야 한다
        assertEquals("닉", view.peer.nickname)
    }

    @Test
    fun `지난 상대 - 잉크로 열어둔 상대는 사흘이 지나도 열려 있다`() {
        val peerAccount = UUID.randomUUID()
        stalePastPeer(peerAccount)
        every { profileAccessService.unlockedPeers(accountId) } returns setOf(peerAccount)

        val view = service.pastPeers(accountId).single()

        assertFalse(view.peer.locked)
        assertEquals(2, view.peer.photoUrls.size)
        assertEquals("지난 답", view.answers[0].content)
    }

    @Test
    fun `지난 상대 - 닫히는 시각은 마지막으로 마음이 오간 때부터 사흘 뒤다`() {
        // 화면이 "얼마나 남았는지"를 보여주려면 서버가 그 시각을 알려줘야 한다.
        // 창은 하트·편지로 연장되므로 소개 시각만으로는 앱이 계산할 수 없다.
        val peerAccount = UUID.randomUUID()
        stalePastPeer(peerAccount)
        val heartedAt = Instant.now()
        every { profileAccessService.lastContactedAtByPeer(accountId) } returns mapOf(peerAccount to heartedAt)

        val view = service.pastPeers(accountId).single()

        assertEquals(heartedAt.plus(ProfileAccess.WINDOW), view.closesAt)
    }

    @Test
    fun `지난 상대 - 잠겼거나 잉크로 열어둔 상대는 닫히는 시각이 없다`() {
        // 잠긴 상대는 남은 기간이랄 게 없고, 잉크로 연 상대는 다시 닫히지 않는다.
        val lockedPeer = UUID.randomUUID()
        stalePastPeer(lockedPeer)
        assertNull(service.pastPeers(accountId).single().closesAt)

        every { profileAccessService.unlockedPeers(accountId) } returns setOf(lockedPeer)
        assertNull(service.pastPeers(accountId).single().closesAt)
    }

    @Test
    fun `지난 상대 - 소개는 오래됐어도 최근에 하트가 오갔으면 열려 있다`() {
        // 창은 마지막으로 마음이 오간 때부터 흐른다.
        val peerAccount = UUID.randomUUID()
        stalePastPeer(peerAccount)
        every { profileAccessService.lastContactedAtByPeer(accountId) } returns mapOf(peerAccount to Instant.now())

        assertFalse(service.pastPeers(accountId).single().peer.locked)
    }

    companion object {
        private val NOON = LocalTime.NOON

        /** 열람 창(사흘)을 확실히 넘긴 시각. */
        private val STALE: Instant = Instant.now().minus(java.time.Duration.ofDays(10))
    }
}
