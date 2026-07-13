package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.DailyReveal
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
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
    private val memberQueryService: MemberQueryService,
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
     * 블라인드 상대. 프로필(성별·나이·키·체형·소개·키워드)은 답변 전에도 미리보기 가능.
     * 답변(글)은 Give&Take — 내가 오늘 답해야 열린다.
     * 하루 1명 비독점 + 성별·선호 일치. 한 번 보면 그날 동안 같은 상대로 고정(pin).
     */
    @Transactional
    fun peerAnswer(accountId: UUID): PeerView {
        val question = pickTodayQuestion()
        val answered = answerRepository.findByAccountIdAndQuestionId(accountId, question.id) != null

        // 이미 오늘 본 상대가 있으면 그대로 고정
        dailyRevealRepository.findByViewerAndQuestion(accountId, question.id)?.let { pinned ->
            answerRepository.findById(pinned.peerAnswerId)?.let { peer ->
                return peerView(peer, answered)
            }
        }

        val me = memberQueryService.findProfile(accountId)
            ?: throw DailyMeetException("프로필을 먼저 완성해주세요")

        // 상호 선호 일치(나는 상대 성별을 선호 + 상대는 내 성별을 선호)하는 후보만
        val candidates = answerRepository.findOthers(question.id, accountId).filter { candidate ->
            val peerProfile = memberQueryService.findProfile(candidate.accountId)
            peerProfile != null &&
                peerProfile.gender == me.preferredGender &&
                peerProfile.preferredGender == me.gender
        }
        if (candidates.isEmpty()) return PeerView.empty(answered)

        // 비독점 + 공평 분배: 지금까지 가장 적게 노출된 상대를 선택(희소한 성별을 여러 명에게 골고루)
        val chosen = candidates.minBy { dailyRevealRepository.countByQuestionAndPeerAnswer(question.id, it.id!!) }
        dailyRevealRepository.save(DailyReveal.create(accountId, question.id, chosen.id!!))
        return peerView(chosen, answered)
    }

    /** 상대 프로필(신원 비공개) + 답변(잠금 시 null). */
    private fun peerView(peer: com.prologue.backend.dailymeet.domain.model.Answer, answered: Boolean): PeerView {
        val p = memberQueryService.findProfile(peer.accountId)
        return PeerView(
            hasPeer = true,
            peerAnswerId = peer.id,
            peerAnswer = if (answered) peer.content else null,
            answerUnlocked = answered,
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
    }
}
