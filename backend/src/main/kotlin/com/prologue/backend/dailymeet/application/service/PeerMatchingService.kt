package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.auth.application.service.LastSeenService
import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.DailyReveal
import com.prologue.backend.dailymeet.domain.model.PeerEligibility
import com.prologue.backend.dailymeet.domain.model.PeerScore
import com.prologue.backend.dailymeet.domain.model.ProfileAccess
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.model.QuestionRotation
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Member
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
    private val profileAccessService: ProfileAccessService,
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
    /**
     * 하루에 소개하는 상대 수.
     *
     * 유저가 적을 때는 1이 맞다. 후보 풀이 얕은데 두 명씩 태우면 두 배로 빨리 마르고,
     * 한 번 만난 사람은 다시 소개하지 않으므로 며칠이면 만날 사람이 없어진다.
     * 사람이 늘면 2로 되돌려 선택의 여지를 준다.
     */
    @param:Value("\${daily.reveal-count:1}") private val revealCount: Int = 1,
    /**
     * 한 사람이 하루에 소개될 수 있는 최대 횟수.
     *
     * 성비가 기울면 적은 쪽이 그만큼 여러 번 소개된다. 남성 100명 여성 10명이면
     * 여성 한 명이 하루 열 번 소개되고, 하트와 알림도 그만큼 쌓인다 — 그 피로가
     * 먼저 떠나게 만드는 원인이 된다.
     *
     * 점수의 공평 분배(PeerScore)는 순서를 조정할 뿐 횟수를 막지 못한다.
     * 후보가 그 사람뿐이면 몇 번이든 뽑히기 때문에, 상한은 따로 있어야 한다.
     *
     * 상한에 걸려 소개할 사람이 없으면 빈 화면이 된다. 그건 손실이 아니라 정직함이다 —
     * 없는 사람을 만들어낼 수는 없고, 한쪽을 갈아 넣어 채우는 것보다 낫다.
     */
    @param:Value("\${daily.max-exposure-per-day:3}") private val maxExposurePerDay: Int = 3,
) {
    /**
     * 오늘의 상대 — 매일 정오(KST)에 [revealCount]명이 공개된다.
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
            // 오늘 공개된 상대는 방금 이어진 사람이라 잠길 수 없다 — 창을 물어볼 것도 없다.
            peers = revealed.map { peerView(accountId, it, answered = true, questions) },
        )
    }

    /**
     * 오늘 공개된 상대 목록. 이미 공개된 건 그대로 두고 [revealCount]에 모자란 만큼만 채운다.
     * 채우는 순서는 점수 순 — 자격을 통과한 후보 중 호감 가능성과 공평 분배를 함께 본 값이다.
     */
    private fun fillRevealed(accountId: UUID, question: Question, questions: List<Question>): List<Answer> {
        val revealed = dailyRevealRepository.findAllByViewerAndQuestion(accountId, question.id)
            .mapNotNull { answerRepository.findById(it.peerAnswerId) }
            .toMutableList()
        if (revealed.size >= revealCount) return revealed

        val me = memberQueryService.findProfile(accountId)
            ?: throw DailyMeetException("프로필을 먼저 완성해주세요")
        val seen = revealed.mapNotNull { it.id }.toSet()
        val alreadyMet = dailyRevealRepository.findEverPairedAccountIds(accountId)

        // 후보는 최근 며칠치 질문에 걸쳐 찾는다. 프로필과 노출 횟수는 점수 계산에도 쓰이니
        // 여기서 한 번만 읽는다 — 뽑을 때마다 다시 세면 후보 수만큼 질의가 반복된다.
        val candidates = answerRepository
            .findOthersByQuestionIds(QuestionRotation.recentIds(questions, LocalDate.now(KST), candidateDays), accountId)
            .filter { it.id !in seen }
            .mapNotNull { answer ->
                val peer = memberQueryService.findProfile(answer.accountId) ?: return@mapNotNull null
                if (!PeerEligibility.isEligible(me, peer, alreadyMet)) return@mapNotNull null
                val exposure = dailyRevealRepository.countByQuestionAndPeerAnswer(question.id, answer.id!!)
                // 오늘 이미 상한만큼 소개된 사람은 더 내보내지 않는다
                if (exposure >= maxExposurePerDay) return@mapNotNull null
                Candidate(answer, peer, exposure)
            }
            .toMutableList()

        // 비독점: 같은 상대가 여러 명에게 노출될 수 있되, 노출될수록 점수가 깎여 쏠리지 않는다.
        while (revealed.size < revealCount && candidates.isNotEmpty()) {
            val chosen = candidates.maxBy { PeerScore.of(me, it.peer, it.exposure) }
            candidates.remove(chosen)
            dailyRevealRepository.save(DailyReveal.create(accountId, question.id, chosen.answer.id!!))
            revealed += chosen.answer
        }
        return revealed
    }

    /** 자격을 통과한 후보 하나 — 프로필과 오늘의 노출 횟수를 함께 들고 다닌다. */
    private data class Candidate(val answer: Answer, val peer: Member, val exposure: Long)

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
        val reveals = dailyRevealRepository.findRecentByViewer(accountId, Instant.now().minus(PAST_PEER_HISTORY))
            .filter { it.questionId != today.id }
            .mapNotNull { reveal -> answerRepository.findById(reveal.peerAnswerId)?.let { reveal to it } }

        // 같은 질문이 여러 공개에 걸릴 수 있으니 열람 여부는 질문별로 한 번만 판정한다
        val answeredByQuestion = reveals.map { (reveal, _) -> reveal.questionId }.distinct()
            .associateWith { answerRepository.findByAccountIdAndQuestionId(accountId, it) != null }

        // 잠김 판정에 필요한 것들은 사람 수와 무관하게 한 번씩만 읽는다
        val unlockedPeers = profileAccessService.unlockedPeers(accountId)
        val contactedAt = profileAccessService.lastContactedAtByPeer(accountId)

        // findRecentByViewer가 최신순이라 묶어도 최신 공개 순이 유지된다
        return reveals
            .groupBy { (_, answer) -> answer.accountId }
            .map { (peerAccountId, grouped) ->
                // 행동(하트·편지)은 열려 있는 답변에 걸린다 — 최신 공개가 잠겨 있어도
                // 예전에 열린 답변이 있으면 그쪽을 대표로 삼아 인연이 끊기지 않게 한다.
                val (latestReveal, _) = grouped.first()
                val (_, actionable) = grouped.firstOrNull { (reveal, _) -> answeredByQuestion[reveal.questionId] == true }
                    ?: grouped.first()

                // 창은 마지막으로 마음이 오간 때부터 흐른다 — 소개와 하트 중 더 최근 쪽.
                val pairedAt = maxOf(latestReveal.createdAt, contactedAt[peerAccountId] ?: latestReveal.createdAt)
                val unlocked = peerAccountId in unlockedPeers
                val open = ProfileAccess.isOpen(pairedAt, unlocked = unlocked)

                val peer = peerView(accountId, actionable, answeredByQuestion[actionable.questionId] == true, questions)
                PastPeerView(
                    question = questionById[latestReveal.questionId]?.content ?: "",
                    revealedAt = latestReveal.createdAt,
                    // 닫히는 시각은 서버가 알려준다 — 창은 하트·편지로 연장되므로
                    // 앱이 소개 시각만 보고 계산하면 실제 잠금과 어긋난다.
                    closesAt = if (open && !unlocked) pairedAt.plus(ProfileAccess.WINDOW) else null,
                    peer = if (open) peer else peer.locked(),
                    answers = grouped.map { (reveal, answer) ->
                        // 창이 닫히면 문답도 함께 닫힌다 — 프로필만 가리고 답이 남으면 잠근 게 아니다.
                        val unlocked = open && answeredByQuestion[reveal.questionId] == true
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
        val open = ProfileAccess.isOpen(
            profileAccessService.pairedAt(accountId, answer.accountId),
            unlocked = answer.accountId in profileAccessService.unlockedPeers(accountId),
        )
        val peer = peerView(accountId, answer, answered, questions)
        return PeerProfileView(
            question = questions.firstOrNull { it.id == answer.questionId }?.content ?: "",
            peer = if (open) peer else peer.locked(),
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

        /**
         * 지난 상대 목록에 남기는 기간.
         *
         * 프로필이 열려 있는 사흘([ProfileAccess.WINDOW])보다 길다 — 사흘이 지나면 목록에서
         * 사라지는 게 아니라 잠긴 채로 남아야, 다시 보고 싶은 사람에게 잉크를 쓸 자리가 생긴다.
         * 이 기간까지 지나면 그때는 정말 지워진다. 무한히 쌓이는 목록은 서랍이지 인연이 아니다.
         */
        private val PAST_PEER_HISTORY: Duration = Duration.ofDays(30)
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
    /**
     * 프로필이 닫히는 시각. 이미 닫혔거나(잠김) 잉크로 열어둬 다시 닫히지 않는 상대는 null.
     *
     * 화면이 "언제 만났는지"가 아니라 "얼마나 남았는지"를 보여줄 수 있게 서버가 계산해 준다 —
     * 창은 마지막으로 마음이 오간 때부터 흐르므로 소개 시각만으로는 알 수 없다.
     */
    val closesAt: Instant?,
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
