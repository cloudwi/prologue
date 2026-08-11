package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.model.QuestionRotation
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/**
 * 오늘의 문답 — 질문을 보여주고 답을 받고 기록을 돌려준다.
 *
 * 소개(누구를 만나는가)는 [PeerMatchingService]가 맡는다. 둘은 "오늘의 질문"만 공유하며,
 * 그 규칙은 도메인([QuestionRotation])에 있다.
 */
@Service
class DailyAnswerService(
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
) {
    @Transactional(readOnly = true)
    fun today(accountId: UUID): TodayView {
        val question = todayQuestion()
        val mine = answerRepository.findByAccountIdAndQuestionId(accountId, question.id)
        return TodayView(question.id, question.content, mine != null, mine?.content)
    }

    /** 오늘의 질문에 답변(최초 작성 또는 수정). */
    @Transactional
    fun answerToday(accountId: UUID, content: String): Answer {
        val question = todayQuestion()
        val existing = answerRepository.findByAccountIdAndQuestionId(accountId, question.id)
        val answer = existing?.apply { updateContent(content) }
            ?: Answer.write(accountId, question.id, content)
        return answerRepository.save(answer)
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

    private fun todayQuestion(): Question =
        QuestionRotation.of(questionRepository.findAllOrdered(), LocalDate.now(KST))

    companion object {
        private val KST = ZoneId.of("Asia/Seoul")
    }
}

/** 내가 남긴 답변 하나 — 그날의 질문과 답한 시각. 본인에게만 보이므로 날짜를 그대로 드러낸다. */
data class MyAnswerView(
    val questionId: Long,
    val question: String,
    val content: String,
    val answeredAt: java.time.Instant,
)
