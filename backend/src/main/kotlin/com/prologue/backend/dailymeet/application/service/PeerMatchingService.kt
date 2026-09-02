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
import com.prologue.backend.dailymeet.domain.model.ServiceDay
import com.prologue.backend.dailymeet.domain.model.TasteAffinity
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.member.application.service.BlockService
import com.prologue.backend.member.application.service.JobVerificationService
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Member
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
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
    private val jobVerificationService: JobVerificationService,
    private val blockService: BlockService,
    private val tasteCardService: TasteCardService,
    private val answerAccessService: AnswerAccessService,
    /**
     * 후보를 찾을 질문의 범위(일). 1이면 오늘 질문에 답한 사람만 후보다.
     *
     * 질문 풀이 100개라 같은 날 같은 질문에 두 사람이 겹칠 확률이 낮다 — 유저가 적을 때
     * 오늘 하루로 묶으면 아무도 만나지 못한다. 사람이 많아지면 1에 가깝게 좁혀
     * "같은 질문에 답한 사람"이라는 원래 결을 되찾는다.
     * (그때는 앱·웹 문구도 "질문에 답한 사람" → "같은 질문에 답한 사람"으로 함께 되돌릴 것.)
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
    /**
     * 첫 범위([candidateDays])에서 후보가 비면 순서대로 넓혀 보는 범위(일). 질문과 무관하게
     * "그 기간 안에 답을 남긴 사람"을 가장 최근 답으로 소개한다. 사람이 적을 때 하루가 비지 않게.
     */
    @param:Value("\${daily.candidate-fallback-days:30,90}") private val candidateFallbackDays: String = "30,90",
    /**
     * 이미 만난 사람을 다시 소개하기까지의 최소 간격(일). 새 후보가 아무도 없을 때만, 그리고
     * 그 사이 상대가 새 답을 남겼을 때만 쓰인다([PeerEligibility.canReintroduce]).
     */
    @param:Value("\${daily.reintroduce-after-days:14}") private val reintroduceAfterDays: Long = 14,
    /**
     * 답하지 않은 사람에게도 오늘의 한 명이 도착하는 시각(KST, 24시간제).
     *
     * 답을 쓴 사람은 이 시계를 기다리지 않는다 — 쓰는 즉시 도착한다. 이 시각은 **쓰지 않은
     * 사람의 자리**만 연다. 그것도 답은 잠긴 채로다: 열려면 그날의 답을 쓰거나 잉크를 낸다.
     */
    @param:Value("\${daily.locked-reveal-hour:12}") private val lockedRevealHour: Int = 12,
) {
    /**
     * 오늘의 상대 — 답을 남기는 순간 [revealCount]명이 도착한다.
     *
     * 시계가 아니라 **행동**이 소개를 연다(유저 결정 2026-08-25). 예전에는 정오에 일제히 공개했는데,
     * 아침에 답한 사람은 보상까지 세 시간을 기다려야 해서 쓰는 일과 만나는 일이 끊겼다.
     * 답이 곧 열쇠가 되면 "쓰면 만난다"가 한 동작으로 붙고, 하루 한 명이라는 리듬은
     * 시계가 아니라 질문이 지킨다 — 하루에 질문이 하나니 하루에 한 명이다.
     *
     * **답하지 않은 사람에게도 정오([lockedRevealHour])가 지나면 오늘의 한 명이 도착한다**
     * (유저 결정 2026-09-02). 다만 답은 잠긴 채로다 — 열려면 그날의 답을 쓰거나 잉크를 낸다
     * ([AnswerAccessService]). 쓰는 사람은 여전히 시계를 기다리지 않고, 쓰지 않는 사람도
     * 빈 화면을 보지 않는다. Give&Take는 사라진 게 아니라 값이 매겨진 것이다.
     *
     * 정오 전이고 아직 답하지 않았다면 자리를 비우지 않고 [carriedOver]로 지난번 상대를 남겨둔다.
     */
    @Transactional
    fun todayPeers(accountId: UUID): TodayPeersView {
        val questions = questionRepository.findAllOrdered()
        val question = QuestionRotation.of(questions, ServiceDay.now())
        val answered = answerRepository.findByAccountIdAndQuestionId(accountId, question.id) != null

        // 잉크로 산 열람권도 답을 쓴 것과 같은 자격이다 — 규칙이 아니라 값의 문제다.
        val canRead = answered || question.id in answerAccessService.unlockedQuestions(accountId)

        if (!answered) {
            // 이미 오늘 몫이 도착했다면 시계와 무관하게 그 사람을 보여준다.
            val alreadyRevealed = dailyRevealRepository.findAllByViewerAndQuestion(accountId, question.id).isNotEmpty()
            if (alreadyRevealed || afterLockedRevealTime()) {
                val revealed = fillRevealed(accountId, question, questions)
                if (revealed.isNotEmpty()) {
                    return TodayPeersView(
                        open = true,
                        answerUnlocked = canRead,
                        carriedOver = false,
                        peers = revealed.map {
                            // 답이 잠긴 카드에는 그 사람의 다른 글도 싣지 않는다 — 옆문으로 다 읽히면 잠근 게 아니다.
                            // 겹치는 취향은 답이 아니라서 남긴다: 열지 말지 정하려면 무언가는 보여야 한다.
                            peerView(accountId, it, answered = canRead, questions, withRecentAnswers = canRead, withSharedTastes = true)
                        },
                    )
                }
            }
            val carried = carriedOverReveals(accountId, question)
            return TodayPeersView(
                // open은 옛 앱을 위해 남는다 — 공개 시각이 사라졌으니 언제나 열려 있다.
                open = true,
                answerUnlocked = false,
                carriedOver = carried.isNotEmpty(),
                peers = carried.map { (_, answer) -> peerView(accountId, answer, answered = true, questions, withRecentAnswers = true) },
            )
        }

        val revealed = fillRevealed(accountId, question, questions)
        return TodayPeersView(
            open = true,
            answerUnlocked = true,
            carriedOver = false,
            // 오늘 공개된 상대는 방금 이어진 사람이라 잠길 수 없다 — 창을 물어볼 것도 없다.
            peers = revealed.map { peerView(accountId, it, answered = true, questions, withRecentAnswers = true) },
        )
    }

    /**
     * 답하지 않은 사람의 자리가 열리는 시각을 지났는가(KST).
     *
     * 하루의 경계는 새벽 5시라([ServiceDay]) 자정~5시는 아직 어제다. 그 시간대에는 어제 몫이
     * 이미 도착해 있으므로 시계를 다시 묻지 않는다 — 여기서는 벽시계의 시(hour)만 본다.
     */
    private fun afterLockedRevealTime(): Boolean =
        java.time.ZonedDateTime.now(ServiceDay.ZONE).hour >= lockedRevealHour

    /**
     * 답을 남기기 전에 오늘의 자리를 지키는 사람 — 지난번에 만난 상대.
     *
     * 자리를 비워두면 "아직 아무도 없어요"라는 빈 화면이 되고, 빈 화면을 본 사람은 다시 열지 않는다.
     * 창이 닫힌(잠긴) 상대는 데려오지 않는다 — 잠긴 카드를 오늘의 자리에 놓는 건 소개가 아니라 광고다.
     * 그 사람의 답은 이미 열려 있다(그날 내가 답했으니 소개됐다) — 그래서 answered=true로 본다.
     */
    private fun carriedOverReveals(accountId: UUID, today: Question): List<Pair<DailyReveal, Answer>> {
        val unlockedPeers = profileAccessService.unlockedPeers(accountId)
        val contactedAt = profileAccessService.lastContactedAtByPeer(accountId)
        return dailyRevealRepository.findRecentByViewer(accountId, Instant.now().minus(PAST_PEER_HISTORY))
            .filter { it.questionId != today.id }
            .mapNotNull { reveal -> answerRepository.findById(reveal.peerAnswerId)?.let { reveal to it } }
            .distinctBy { (_, answer) -> answer.accountId }
            .filter { (reveal, answer) ->
                // 창은 마지막으로 마음이 오간 때부터 흐른다 — 소개와 하트·편지 중 더 최근 쪽.
                val pairedAt = maxOf(reveal.createdAt, contactedAt[answer.accountId] ?: reveal.createdAt)
                ProfileAccess.isOpen(pairedAt, unlocked = answer.accountId in unlockedPeers)
            }
            .take(revealCount)
    }

    /**
     * 오늘 공개된 상대 목록. 이미 공개된 건 그대로 두고 [revealCount]에 모자란 만큼만 채운다.
     * 채우는 순서는 점수 순 — 자격을 통과한 후보 중 호감 가능성과 공평 분배를 함께 본 값이다.
     *
     * 후보는 가까운 범위부터 찾는다 — 최근 [candidateDays]치 질문에 답한 사람 → [candidateFallbackDays]
     * 안에 답한 사람 → 그래도 없으면 이미 만났던 사람 중 다시 소개해도 되는 사람. 사람이 적을 때
     * "오늘은 아무도 없음"이 되는 날을 최대한 줄이되, 가까운 결을 먼저 쓴다.
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
        // 차단(번호·같은 회사)은 자격 이전의 문제다 — 어느 풀에서 왔든, 재소개 예외로도 뚫리면 안 된다.
        val exclusion = blockService.exclusionFor(accountId, me.phone)
        val now = Instant.now()

        // 후보 풀은 가까운 범위부터, 비어 있으면 다음 범위로. 각 풀은 필요할 때만 읽는다.
        val pools: List<() -> List<Answer>> = listOf(
            { answerRepository.findOthersByQuestionIds(QuestionRotation.recentIds(questions, ServiceDay.now(), candidateDays), accountId) },
        ) + fallbackDays().map { days ->
            { answerRepository.findOthersAnsweredSince(now.minus(Duration.ofDays(days.toLong())), accountId) }
        }

        var candidates = mutableListOf<Candidate>()
        for (pool in pools) {
            candidates = toCandidates(pool(), me, question, seen) { peer, _ ->
                !exclusion.excludes(peer) && PeerEligibility.isEligible(me, peer, alreadyMet)
            }
            if (candidates.isNotEmpty()) break
        }

        // 새 후보가 한 명도 없을 때만 — 만났던 사람 중 충분히 시간이 지났고 새 답을 남긴 사람.
        if (candidates.isEmpty()) {
            val widest = fallbackDays().maxOrNull() ?: candidateDays
            val pool = answerRepository.findOthersAnsweredSince(now.minus(Duration.ofDays(widest.toLong())), accountId)
            candidates = toCandidates(pool, me, question, seen) { peer, answer ->
                !exclusion.excludes(peer) &&
                    PeerEligibility.isEligible(me, peer, alreadyMet = emptySet()) &&
                    PeerEligibility.canReintroduce(
                        lastRevealedAt = dailyRevealRepository.findLastRevealedAtBetween(accountId, peer.accountId),
                        answerWrittenAt = answer.createdAt,
                        now = now,
                        cooldown = Duration.ofDays(reintroduceAfterDays),
                    )
            }
        }

        // 취향 겹침은 후보 전원 몫을 한 번에 읽는다 — 점수 계산 안에서 사람마다 읽으면 N+1이다.
        val myTastes = tasteCardService.optionsOf(accountId)
        val peerTastes = if (myTastes.isEmpty()) emptyMap() else tasteCardService.optionsOf(candidates.map { it.peer.accountId })

        // 비독점: 같은 상대가 여러 명에게 노출될 수 있되, 노출될수록 점수가 깎여 쏠리지 않는다.
        while (revealed.size < revealCount && candidates.isNotEmpty()) {
            val chosen = candidates.maxBy {
                PeerScore.of(
                    me,
                    it.peer,
                    it.exposure,
                    tasteOverlap = TasteAffinity.overlap(myTastes, peerTastes[it.peer.accountId] ?: emptyMap()),
                )
            }
            candidates.remove(chosen)
            // 한 사람이 여러 답으로 풀에 있어도 하루에 한 번만 — 사람 단위로 걷어낸다
            candidates.removeAll { it.peer.accountId == chosen.peer.accountId }
            dailyRevealRepository.save(DailyReveal.create(accountId, question.id, chosen.answer.id!!))
            revealed += chosen.answer
        }
        return revealed
    }

    /**
     * 답변 목록을 자격 통과한 후보로 바꾼다. 같은 사람의 답이 여럿이면 가장 최근 것 하나만 남긴다 —
     * 소개는 사람 단위고, 카드에 올릴 답은 그 사람의 가장 가까운 이야기가 맞다.
     * 프로필과 노출 횟수는 점수 계산에도 쓰이니 여기서 한 번만 읽는다.
     */
    private fun toCandidates(
        answers: List<Answer>,
        me: Member,
        question: Question,
        seen: Set<UUID>,
        eligible: (peer: Member, answer: Answer) -> Boolean,
    ): MutableList<Candidate> =
        answers
            .filter { it.id !in seen }
            .groupBy { it.accountId }
            .values
            .map { perAccount -> perAccount.maxBy { it.createdAt } }
            .mapNotNull { answer ->
                val peer = memberQueryService.findProfile(answer.accountId) ?: return@mapNotNull null
                if (!eligible(peer, answer)) return@mapNotNull null
                val exposure = dailyRevealRepository.countByQuestionAndPeerAnswer(question.id, answer.id!!)
                // 오늘 이미 상한만큼 소개된 사람은 더 내보내지 않는다
                if (exposure >= maxExposurePerDay) return@mapNotNull null
                Candidate(answer, peer, exposure)
            }
            .toMutableList()

    private fun fallbackDays(): List<Int> =
        candidateFallbackDays.split(',').mapNotNull { it.trim().toIntOrNull() }.filter { it > candidateDays }.sorted()

    /**
     * 답할 때 후보가 없어 비어 있던 자리를 나중에 채운다 — 스케줄러가 오늘 답한 사람마다 부른다.
     *
     * 답변이 곧 소개가 된 뒤에도 이 자리는 남는다. 아침에 답했는데 그 시각에 자격을 갖춘 후보가
     * 하나도 없었다면(노출 상한·성비) 자리가 빈 채로 하루가 간다 — 저녁에 누가 답을 남겨도
     * 앱을 다시 열어야만 만나고, 빈 화면을 본 사람은 다시 열지 않는다.
     * 새로 채워졌으면 true. 채워진 사람에게만 "도착했어요"를 보낸다.
     */
    @Transactional
    fun fillLateArrival(accountId: UUID): Boolean {
        val questions = questionRepository.findAllOrdered()
        val question = QuestionRotation.of(questions, ServiceDay.now())
        if (answerRepository.findByAccountIdAndQuestionId(accountId, question.id) == null) return false
        val before = dailyRevealRepository.findAllByViewerAndQuestion(accountId, question.id).size
        if (before >= revealCount) return false
        return fillRevealed(accountId, question, questions).size > before
    }

    /** 자격을 통과한 후보 하나 — 프로필과 오늘의 노출 횟수를 함께 들고 다닌다. */
    private data class Candidate(val answer: Answer, val peer: Member, val exposure: Long)

    /**
     * 지난 상대 — 최근 30일 안에 공개됐던 상대(오늘 공개분 제외), 최신 공개 순.
     * 하루가 지났다고 인연이 증발하지 않게, 소개는 짧은 여운을 남긴다.
     * 같은 상대가 여러 날 공개됐으면 한 사람으로 묶고 그동안의 문답을 목록으로 잇는다.
     * 답변 열람은 각 질문의 Give&Take 그대로: 그날 내가 답했으면 열려 있다.
     */
    @Transactional(readOnly = true)
    fun pastPeers(accountId: UUID): List<PastPeerView> {
        val questions = questionRepository.findAllOrdered()
        val today = QuestionRotation.of(questions, ServiceDay.now())
        val questionById = questions.associateBy { it.id }

        // 아직 오늘 답하지 않았다면 지난번 상대가 "오늘의 상대" 자리를 지키고 있다 — 여기서 또 보이면 같은 사람이 두 번이다.
        val carriedOver = if (answerRepository.findByAccountIdAndQuestionId(accountId, today.id) != null) {
            emptySet()
        } else {
            carriedOverReveals(accountId, today).map { (_, answer) -> answer.accountId }.toSet()
        }

        val reveals = dailyRevealRepository.findRecentByViewer(accountId, Instant.now().minus(PAST_PEER_HISTORY))
            .filter { it.questionId != today.id }
            .mapNotNull { reveal -> answerRepository.findById(reveal.peerAnswerId)?.let { reveal to it } }
            .filter { (_, answer) -> answer.accountId !in carriedOver }

        // 같은 질문이 여러 공개에 걸릴 수 있으니 열람 여부는 질문별로 한 번만 판정한다.
        // 잉크로 산 열람권도 답을 쓴 것과 같은 자격이다(AnswerAccessService) — 규칙이 아니라 값의 문제다.
        val unlockedQuestions = answerAccessService.unlockedQuestions(accountId)
        val answeredByQuestion = reveals.map { (reveal, _) -> reveal.questionId }.distinct()
            .associateWith { it in unlockedQuestions || answerRepository.findByAccountIdAndQuestionId(accountId, it) != null }

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
                            questionId = reveal.questionId,
                            peerAnswerId = answer.id,
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
        // 잉크로 산 열람권도 답을 쓴 것과 같은 자격이다.
        val answered = answer.questionId in answerAccessService.unlockedQuestions(accountId) ||
            answerRepository.findByAccountIdAndQuestionId(accountId, answer.questionId) != null
        val questions = questionRepository.findAllOrdered()
        val open = ProfileAccess.isOpen(
            profileAccessService.pairedAt(accountId, answer.accountId),
            unlocked = answer.accountId in profileAccessService.unlockedPeers(accountId),
        )
        val peer = peerView(accountId, answer, answered, questions, withRecentAnswers = true)
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
        withRecentAnswers: Boolean = false,
        withSharedTastes: Boolean = withRecentAnswers,
    ): PeerView {
        // 겹치는 취향은 한 사람을 자세히 보는 자리에서만 — 목록에서는 사람마다 선택 테이블을 더 읽는 값이 된다.
        val sharedTastes = if (withSharedTastes) tasteCardService.sharedWith(viewerAccountId, peer.accountId) else emptyList()
        val p = memberQueryService.findProfile(peer.accountId)
        val jobDomain = jobVerificationService.verifiedDomain(peer.accountId)
        return PeerView(
            mailSent = mailRepository.existsBySenderAndRecipient(viewerAccountId, peer.accountId),
            hearted = heartRepository.existsFromTo(viewerAccountId, peer.accountId),
            peerAnswerId = peer.id,
            peerAnswer = if (answered) peer.content else null,
            questionId = peer.questionId,
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
            religion = p?.religion,
            politicalLeaning = p?.politicalLeaning,
            hobbies = p?.hobbies ?: emptyList(),
            interests = p?.interests ?: emptyList(),
            strengths = p?.strengths ?: emptyList(),
            avatarId = p?.avatarId,
            lastActive = LastActiveBucket.of(lastSeenService.lastSeenAt(peer.accountId)),
            jobVerified = jobDomain != null,
            jobDomain = jobDomain,
            recentAnswers = if (withRecentAnswers) recentAnswersOf(peer, questions) else emptyList(),
            sharedTastes = sharedTastes,
        )
    }

    /**
     * 그 사람이 최근에 남긴 답 [RECENT_ANSWER_COUNT]편 — 카드에 이미 올린 답 하나는 뺀다.
     *
     * 목록 화면에서는 부르지 않는다. 사람마다 답변 테이블을 한 번씩 더 읽는 일이라,
     * 한 사람을 자세히 보는 자리(오늘의 상대·프로필 상세)에서만 값을 치른다.
     */
    private fun recentAnswersOf(shown: Answer, questions: List<Question>): List<PeerAnswerView> {
        val questionById = questions.associateBy { it.id }
        return answerRepository.findAllByAccountId(shown.accountId)
            .asSequence()
            .filter { it.id != shown.id }
            .sortedByDescending { it.createdAt }
            .take(RECENT_ANSWER_COUNT)
            .mapNotNull { answer ->
                val question = questionById[answer.questionId] ?: return@mapNotNull null
                PeerAnswerView(answer.questionId, question.content, answer.content, answer.createdAt)
            }
            .toList()
    }

    companion object {
        /**
         * 지난 상대 목록에 남기는 기간.
         *
         * 프로필이 열려 있는 사흘([ProfileAccess.WINDOW])보다 길다 — 사흘이 지나면 목록에서
         * 사라지는 게 아니라 잠긴 채로 남아야, 다시 보고 싶은 사람에게 잉크를 쓸 자리가 생긴다.
         * 이 기간까지 지나면 그때는 정말 지워진다. 무한히 쌓이는 목록은 서랍이지 인연이 아니다.
         */
        private val PAST_PEER_HISTORY: Duration = Duration.ofDays(30)

        /**
         * 프로필에 함께 싣는 최근 답변 수.
         *
         * 셋이면 그 사람의 결이 보이고, 그 이상은 프로필이 답변 목록이 된다 —
         * 프로필은 읽히라고 있는 것이지 훑으라고 있는 게 아니다.
         */
        private const val RECENT_ANSWER_COUNT = 3
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
    /** 그날의 질문 id — 잠긴 하루를 잉크로 열 때 앱이 가리키는 값이다([AnswerAccessService]). */
    val questionId: Long,
    /** 그날 상대가 쓴 답의 id — 열고 난 뒤 그 한 편을 다시 읽어올 때 쓴다. */
    val peerAnswerId: UUID?,
    val question: String,
    val content: String?,
    val unlocked: Boolean,
    val revealedAt: Instant,
)
