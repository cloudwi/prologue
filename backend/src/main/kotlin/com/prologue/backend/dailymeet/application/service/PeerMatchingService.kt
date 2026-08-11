package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.auth.application.service.LastSeenService
import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.DailyReveal
import com.prologue.backend.dailymeet.domain.model.PeerEligibility
import com.prologue.backend.dailymeet.domain.model.PeerScore
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.model.QuestionRotation
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID

/**
 * 소개 — 오늘 누구를 만나는가.
 *
 * 답을 쓰고 읽는 일은 [DailyAnswerService]가 맡는다. 여기서 다루는 건 "누구를 보여줄지"뿐이다.
 * 그 판단은 두 도메인 규칙으로 나뉜다 — 자격([PeerEligibility])과 우선순위([PeerScore]).
 */
@Service
class PeerMatchingService(
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
    private val dailyRevealRepository: DailyRevealRepository,
    private val mailRepository: MailRepository,
    private val heartRepository: HeartRepository,
    private val memberQueryService: MemberQueryService,
    private val profileLetterService: ProfileLetterService,
    private val lastSeenService: LastSeenService,
    /** 오늘의 상대 공개 시각. 기본 정오(KST), 개발 환경에서는 DAILY_REVEAL_TIME으로 앞당긴다. */
    @param:Value("\${daily.reveal-time:12:00}") private val revealTime: LocalTime = LocalTime.NOON,
    /**
     * 후보를 찾을 질문의 범위(일). 1이면 오늘 질문에 답한 사람만 후보다.
     *
     * 질문 풀이 100개라 같은 날 같은 질문에 두 사람이 겹칠 확률이 낮다 — 유저가 적을 때
     * 오늘 하루로 묶으면 아무도 만나지 못한다. 사람이 많아지면 1에 가깝게 좁혀
     * "같은 질문에 답한 사람"이라는 원래 결을 되찾는다.
     */
    @param:Value("\${daily.candidate-days:7}") private val candidateDays: Int = 7,
) {
    /**
     * 오늘의 상대 — 매일 정오(KST)에 두 사람이 공개된다.
     * 내가 오늘 질문에 답해야 상대가 보인다(Give&Take) — 받기만 하는 사람은 없게 한다.
     * 공개된 상대는 그날 동안 고정(비독점: 같은 상대가 여러 명에게 노출 가능) + 공평 분배.
     * 정오에 부족했으면 이후 조회 때마다 후보가 생기는 대로 채운다 — 먼저 답한 사람도 결국 소개받는다.
     */
    @Transactional
    fun todayPeers(accountId: UUID, now: LocalTime = LocalTime.now(KST)): TodayPeersView {
        val questions = questionRepository.findAllOrdered()
        val question = QuestionRotation.of(questions, LocalDate.now(KST))
        val answered = answerRepository.findByAccountIdAndQuestionId(accountId, question.id) != null

        // 정오 전에는 아직 공개 전
        if (now.isBefore(revealTime)) return TodayPeersView(open = false, answerUnlocked = answered, peers = emptyList())

        // 내가 답하기 전에는 상대를 만들지도 보여주지도 않는다.
        // 여기서 일찍 빠져나가야 공개 기록(DailyReveal)도 남지 않는다 — 답하지 않은 사람 때문에
        // 후보의 노출 횟수가 올라가면, 정작 답한 사람들에게 돌아갈 몫이 줄어든다.
        if (!answered) return TodayPeersView(open = true, answerUnlocked = false, peers = emptyList())

        val revealed = fillRevealed(accountId, question, questions)
        return TodayPeersView(
            open = true,
            answerUnlocked = true,
            peers = revealed.map { peerView(accountId, it, answered = true, questions) },
        )
    }

    /**
     * 오늘 공개된 상대 목록. 이미 공개된 건 그대로 두고 [REVEAL_COUNT]에 모자란 만큼만 채운다.
     * 채우는 순서는 점수 순 — 자격을 통과한 후보 중 호감 가능성과 공평 분배를 함께 본 값이다.
     */
    private fun fillRevealed(accountId: UUID, question: Question, questions: List<Question>): List<Answer> {
        val revealed = dailyRevealRepository.findAllByViewerAndQuestion(accountId, question.id)
            .mapNotNull { answerRepository.findById(it.peerAnswerId) }
            .toMutableList()
        if (revealed.size >= REVEAL_COUNT) return revealed

        val me = memberQueryService.findProfile(accountId)
            ?: throw DailyMeetException("프로필을 먼저 완성해주세요")
        val seen = revealed.mapNotNull { it.id }.toSet()
        val alreadyMet = dailyRevealRepository.findRevealedPeerAccountIds(accountId).toSet()

        // 후보는 최근 며칠치 질문에 걸쳐 찾는다. 프로필은 점수 계산에도 쓰이니 한 번만 읽어 답변과 짝짓는다.
        val candidates = answerRepository
            .findOthersByQuestionIds(QuestionRotation.recentIds(questions, LocalDate.now(KST), candidateDays), accountId)
            .filter { it.id !in seen }
            .mapNotNull { answer ->
                val peer = memberQueryService.findProfile(answer.accountId) ?: return@mapNotNull null
                if (!PeerEligibility.isEligible(me, peer, alreadyMet)) return@mapNotNull null
                answer to peer
            }
            .toMutableList()

        // 비독점: 같은 상대가 여러 명에게 노출될 수 있되, 노출될수록 점수가 깎여 쏠리지 않는다.
        while (revealed.size < REVEAL_COUNT && candidates.isNotEmpty()) {
            val chosen = candidates.maxBy { (answer, peer) ->
                PeerScore.of(me, peer, dailyRevealRepository.countByQuestionAndPeerAnswer(question.id, answer.id!!))
            }
            candidates.remove(chosen)
            dailyRevealRepository.save(DailyReveal.create(accountId, question.id, chosen.first.id!!))
            revealed += chosen.first
        }
        return revealed
    }

    /**
     * 지난 상대 — 최근 3일 동안 공개됐던 상대(오늘 공개분 제외), 최신 공개 순.
     * 하루가 지났다고 인연이 증발하지 않게, 소개는 짧은 여운을 남긴다.
     * 같은 상대가 여러 날 공개됐으면 한 사람으로 묶고 그동안의 문답을 목록으로 잇는다.
     * 답변 열람은 각 질문의 Give&Take 그대로: 그날 내가 답했으면 열려 있다.
     */
    @Transactional(readOnly = true)
    fun pastPeers(accountId: UUID): List<PastPeerView> {
        val questions = questionRepository.findAllOrdered()
        val today = QuestionRotation.of(questions, LocalDate.now(KST))
        val questionById = questions.associateBy { it.id }
        val reveals = dailyRevealRepository.findRecentByViewer(accountId, Instant.now().minus(PAST_PEER_WINDOW))
            .filter { it.questionId != today.id }
            .mapNotNull { reveal -> answerRepository.findById(reveal.peerAnswerId)?.let { reveal to it } }

        // 같은 질문이 여러 공개에 걸릴 수 있으니 열람 여부는 질문별로 한 번만 판정한다
        val answeredByQuestion = reveals.map { (reveal, _) -> reveal.questionId }.distinct()
            .associateWith { answerRepository.findByAccountIdAndQuestionId(accountId, it) != null }

        // findRecentByViewer가 최신순이라 묶어도 최신 공개 순이 유지된다
        return reveals
            .groupBy { (_, answer) -> answer.accountId }
            .map { (_, grouped) ->
                // 행동(하트·편지)은 열려 있는 답변에 걸린다 — 최신 공개가 잠겨 있어도
                // 예전에 열린 답변이 있으면 그쪽을 대표로 삼아 인연이 끊기지 않게 한다.
                val (latestReveal, _) = grouped.first()
                val (_, actionable) = grouped.firstOrNull { (reveal, _) -> answeredByQuestion[reveal.questionId] == true }
                    ?: grouped.first()
                PastPeerView(
                    question = questionById[latestReveal.questionId]?.content ?: "",
                    revealedAt = latestReveal.createdAt,
                    peer = peerView(accountId, actionable, answeredByQuestion[actionable.questionId] == true, questions),
                    answers = grouped.map { (reveal, answer) ->
                        val unlocked = answeredByQuestion[reveal.questionId] == true
                        PastAnswerView(
                            question = questionById[reveal.questionId]?.content ?: "",
                            content = if (unlocked) answer.content else null,
                            unlocked = unlocked,
                            revealedAt = reveal.createdAt,
                        )
                    },
                )
            }
    }

    /**
     * 답변 id로 상대 프로필 상세 — 편지함(받은 하트) 카드에서 프로필로 들어갈 때.
     * 답변 열람은 그 질문의 Give&Take 그대로: 그날 내가 답했으면 열려 있다.
     */
    @Transactional(readOnly = true)
    fun peerProfile(accountId: UUID, peerAnswerId: UUID): PeerProfileView {
        val answer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        if (answer.accountId == accountId) throw DailyMeetException("내 프로필이에요")
        val answered = answerRepository.findByAccountIdAndQuestionId(accountId, answer.questionId) != null
        val questions = questionRepository.findAllOrdered()
        return PeerProfileView(
            question = questions.firstOrNull { it.id == answer.questionId }?.content ?: "",
            peer = peerView(accountId, answer, answered, questions),
        )
    }

    /**
     * 상대 프로필(사진·닉네임 포함, 생년월일 등 원본은 비공개) + 답변(잠금 시 null).
     * 질문 목록을 인자로 받는다 — 상대마다 다시 읽으면 사람 수만큼 질문 테이블을 훑게 된다.
     */
    private fun peerView(
        viewerAccountId: UUID,
        peer: Answer,
        answered: Boolean,
        questions: List<Question>,
    ): PeerView {
        val p = memberQueryService.findProfile(peer.accountId)
        return PeerView(
            mailSent = mailRepository.existsBySenderAndRecipient(viewerAccountId, peer.accountId),
            hearted = heartRepository.existsFromTo(viewerAccountId, peer.accountId),
            peerAnswerId = peer.id,
            peerAnswer = if (answered) peer.content else null,
            question = questions.firstOrNull { it.id == peer.questionId }?.content,
            answerUnlocked = answered,
            photoUrls = p?.photoUrls ?: emptyList(),
            nickname = p?.nickname,
            letters = profileLetterService.lettersOf(peer.accountId),
            gender = p?.gender,
            age = p?.age(),
            region = p?.region,
            bio = p?.bio,
            heightCm = p?.heightCm,
            bodyType = p?.bodyType,
            hobbies = p?.hobbies ?: emptyList(),
            interests = p?.interests ?: emptyList(),
            strengths = p?.strengths ?: emptyList(),
            avatarId = p?.avatarId,
            lastActive = LastActiveBucket.of(lastSeenService.lastSeenAt(peer.accountId)),
        )
    }

    companion object {
        private val KST = ZoneId.of("Asia/Seoul")

        /** 하루에 공개되는 상대 수 — 답하면 두 사람을 만나는 페이스. */
        private const val REVEAL_COUNT = 2

        /** 지난 상대를 보여주는 기간 — 소개의 여운은 사흘. */
        private val PAST_PEER_WINDOW: Duration = Duration.ofDays(3)
    }
}

/** 답변 id로 조회한 상대 프로필 — 그 답의 질문을 함께(상세 화면의 문답 라벨). */
data class PeerProfileView(
    val question: String,
    val peer: PeerView,
)

/** 지난 상대 한 명 — 그날의 질문·공개 시각과 함께. 여러 날 공개됐으면 문답이 쌓인다. */
data class PastPeerView(
    val question: String,
    val revealedAt: Instant,
    val peer: PeerView,
    val answers: List<PastAnswerView>,
)

/** 지난 상대가 남긴 문답 하나 — 열람은 그 질문의 Give&Take 그대로(잠기면 content는 null). */
data class PastAnswerView(
    val question: String,
    val content: String?,
    val unlocked: Boolean,
    val revealedAt: Instant,
)
