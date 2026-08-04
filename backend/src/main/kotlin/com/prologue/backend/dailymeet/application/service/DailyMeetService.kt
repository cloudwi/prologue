package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.DailyReveal
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID

/**
 * 오늘의 문답 유스케이스.
 * "오늘의 질문"은 질문 풀에서 한국 날짜(epochDay) 기준으로 결정적으로 선택된다(모두 같은 질문).
 */
@Service
class DailyMeetService(
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
    private val dailyRevealRepository: DailyRevealRepository,
    private val mailRepository: MailRepository,
    private val memberQueryService: MemberQueryService,
    private val profileLetterService: ProfileLetterService,
    /** 오늘의 상대 공개 시각. 기본 정오(KST), 개발 환경에서는 DAILY_REVEAL_TIME으로 앞당긴다. */
    @param:Value("\${daily.reveal-time:12:00}") private val revealTime: LocalTime = LocalTime.NOON,
) {
    @Transactional(readOnly = true)
    fun today(accountId: UUID): TodayView {
        val question = pickTodayQuestion()
        val mine = answerRepository.findByAccountIdAndQuestionId(accountId, question.id)
        return TodayView(question.id, question.content, mine != null, mine?.content)
    }

    /** 오늘의 질문에 답변(최초 작성 또는 수정). */
    @Transactional
    fun answerToday(accountId: UUID, content: String): Answer {
        val question = pickTodayQuestion()
        val existing = answerRepository.findByAccountIdAndQuestionId(accountId, question.id)
        val answer = existing?.apply { updateContent(content) }
            ?: Answer.write(accountId, question.id, content)
        return answerRepository.save(answer)
    }

    /**
     * 오늘의 상대 — 매일 정오(KST)에 두 사람이 공개된다.
     * 프로필(성별·나이·키·소개·키워드)은 바로 보이고, 답변(글)은 Give&Take: 내가 오늘 답해야 열린다.
     * 공개된 상대는 그날 동안 고정(비독점: 같은 상대가 여러 명에게 노출 가능) + 공평 분배.
     * 정오에 부족했으면 이후 조회 때마다 후보가 생기는 대로 채운다 — 먼저 답한 사람도 결국 소개받는다.
     */
    @Transactional
    fun todayPeers(accountId: UUID, now: LocalTime = LocalTime.now(KST)): TodayPeersView {
        val question = pickTodayQuestion()
        val answered = answerRepository.findByAccountIdAndQuestionId(accountId, question.id) != null

        // 정오 전에는 아직 공개 전
        if (now.isBefore(revealTime)) return TodayPeersView(open = false, answerUnlocked = answered, peers = emptyList())

        // 이미 공개된 상대는 그대로 고정
        val revealed = dailyRevealRepository.findAllByViewerAndQuestion(accountId, question.id)
            .mapNotNull { answerRepository.findById(it.peerAnswerId) }
            .toMutableList()

        // 아직 공개된 상대가 없으면 후보에서 채운다
        if (revealed.size < REVEAL_COUNT) {
            val me = memberQueryService.findProfile(accountId)
                ?: throw DailyMeetException("프로필을 먼저 완성해주세요")

            val seen = revealed.mapNotNull { it.id }.toSet()
            // 상호 선호 일치(나는 상대 성별을 선호 + 상대는 내 성별을 선호)하는 후보만
            val candidates = answerRepository.findOthers(question.id, accountId)
                .filter { it.id !in seen }
                .filter { candidate ->
                    val peerProfile = memberQueryService.findProfile(candidate.accountId)
                    peerProfile != null &&
                        peerProfile.gender == me.preferredGender &&
                        peerProfile.preferredGender == me.gender
                }
                .toMutableList()

            // 비독점 + 공평 분배: 지금까지 가장 적게 노출된 상대부터 선택(희소한 성별을 여러 명에게 골고루)
            while (revealed.size < REVEAL_COUNT && candidates.isNotEmpty()) {
                val chosen = candidates.minBy { dailyRevealRepository.countByQuestionAndPeerAnswer(question.id, it.id!!) }
                candidates.remove(chosen)
                dailyRevealRepository.save(DailyReveal.create(accountId, question.id, chosen.id!!))
                revealed += chosen
            }
        }

        return TodayPeersView(open = true, answerUnlocked = answered, peers = revealed.map { peerView(accountId, it, answered) })
    }

    /**
     * 지난 상대 — 최근 3일 동안 공개됐던 상대(오늘 공개분 제외), 최신 공개 순.
     * 하루가 지났다고 인연이 증발하지 않게, 소개는 짧은 여운을 남긴다.
     * 같은 상대가 여러 날 공개됐으면 한 사람으로 묶고 그동안의 문답을 목록으로 잇는다.
     * 답변 열람은 각 질문의 Give&Take 그대로: 그날 내가 답했으면 열려 있다.
     */
    @Transactional(readOnly = true)
    fun pastPeers(accountId: UUID): List<PastPeerView> {
        val today = pickTodayQuestion()
        val questions = questionRepository.findAllOrdered().associateBy { it.id }
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
                // 행동(하트·대화 신청)은 열려 있는 답변에 걸린다 — 최신 공개가 잠겨 있어도
                // 예전에 열린 답변이 있으면 그쪽을 대표로 삼아 인연이 끊기지 않게 한다.
                val (latestReveal, _) = grouped.first()
                val (_, actionable) = grouped.firstOrNull { (reveal, _) -> answeredByQuestion[reveal.questionId] == true }
                    ?: grouped.first()
                PastPeerView(
                    question = questions[latestReveal.questionId]?.content ?: "",
                    revealedAt = latestReveal.createdAt,
                    peer = peerView(accountId, actionable, answeredByQuestion[actionable.questionId] == true),
                    answers = grouped.map { (reveal, answer) ->
                        val unlocked = answeredByQuestion[reveal.questionId] == true
                        PastAnswerView(
                            question = questions[reveal.questionId]?.content ?: "",
                            content = if (unlocked) answer.content else null,
                            unlocked = unlocked,
                            revealedAt = reveal.createdAt,
                        )
                    },
                )
            }
    }

    /**
     * 내가 남긴 답 — 역대 답변 전부를 질문과 함께 최신순으로.
     * 본인 전용 기록이다: 상대에게는 past-peers의 짧은 창(3일)만 보이고, 이 전체 목록은 절대 내려가지 않는다.
     */
    @Transactional(readOnly = true)
    fun myAnswers(accountId: UUID): List<MyAnswerView> {
        val questions = questionRepository.findAllOrdered().associateBy { it.id }
        return answerRepository.findAllByAccountId(accountId).map { answer ->
            MyAnswerView(
                questionId = answer.questionId,
                question = questions[answer.questionId]?.content ?: "",
                content = answer.content,
                answeredAt = answer.createdAt,
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
        val questions = questionRepository.findAllOrdered().associateBy { it.id }
        return PeerProfileView(
            question = questions[answer.questionId]?.content ?: "",
            peer = peerView(accountId, answer, answered),
        )
    }

    /** 상대 프로필(사진·닉네임 포함, 생년월일 등 원본은 비공개) + 답변(잠금 시 null). */
    private fun peerView(viewerAccountId: UUID, peer: com.prologue.backend.dailymeet.domain.model.Answer, answered: Boolean): PeerView {
        val p = memberQueryService.findProfile(peer.accountId)
        return PeerView(
            mailSent = mailRepository.existsBySenderAndRecipient(viewerAccountId, peer.accountId),
            peerAnswerId = peer.id,
            peerAnswer = if (answered) peer.content else null,
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
        )
    }

    private fun pickTodayQuestion(): Question {
        val questions = questionRepository.findAllOrdered()
        if (questions.isEmpty()) throw DailyMeetException("등록된 질문이 없습니다")
        val index = (LocalDate.now(KST).toEpochDay() % questions.size).toInt()
        return questions[index]
    }

    companion object {
        private val KST = ZoneId.of("Asia/Seoul")

        /** 하루에 공개되는 상대 수 — 답하면 두 사람을 만나는 페이스. */
        private const val REVEAL_COUNT = 2

        /** 지난 상대를 보여주는 기간 — 소개의 여운은 사흘. */
        private val PAST_PEER_WINDOW: java.time.Duration = java.time.Duration.ofDays(3)
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
    val revealedAt: java.time.Instant,
    val peer: PeerView,
    val answers: List<PastAnswerView>,
)

/** 내가 남긴 답변 하나 — 그날의 질문과 답한 시각. 본인에게만 보이므로 날짜를 그대로 드러낸다. */
data class MyAnswerView(
    val questionId: Long,
    val question: String,
    val content: String,
    val answeredAt: java.time.Instant,
)

/** 지난 상대가 남긴 문답 하나 — 열람은 그 질문의 Give&Take 그대로(잠기면 content는 null). */
data class PastAnswerView(
    val question: String,
    val content: String?,
    val unlocked: Boolean,
    val revealedAt: java.time.Instant,
)
