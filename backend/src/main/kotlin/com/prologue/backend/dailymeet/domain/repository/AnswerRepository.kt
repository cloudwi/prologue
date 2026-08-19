package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Answer
import java.util.UUID

interface AnswerRepository {
    fun findByAccountIdAndQuestionId(accountId: UUID, questionId: Long): Answer?
    fun findById(id: UUID): Answer?
    fun save(answer: Answer): Answer

    /** 같은 질문에 대한 '나 외의' 답변 하나(최신). 블라인드 상대 답변용. */
    fun findOtherAnswer(questionId: Long, excludeAccountId: UUID): Answer?

    /** 같은 질문에 대한 '나 외의' 모든 답변. 성별·선호 필터링/페어링용. */
    fun findOthers(questionId: Long, excludeAccountId: UUID): List<Answer>

    /**
     * 여러 질문에 걸친 '나 외의' 모든 답변. 오늘의 상대 후보를 최근 며칠치로 넓힐 때 쓴다.
     * 유저가 적으면 같은 날 같은 질문에 겹칠 확률이 낮아, 후보를 오늘 하루로 묶으면 아무도 못 만난다.
     */
    fun findOthersByQuestionIds(questionIds: List<Long>, excludeAccountId: UUID): List<Answer>

    /**
     * [since] 이후에 쓰인 '나 외의' 모든 답변 — 후보 풀을 "최근 며칠치 질문"보다 넓게, 사람이 적을 때
     * "한 번이라도 최근에 답한 사람"까지 늘릴 때 쓴다. 질문이 무엇이든 상관없다.
     */
    fun findOthersAnsweredSince(since: java.time.Instant, excludeAccountId: UUID): List<Answer>

    /** 한 질문에 달린 모든 답변 — 오늘 답한 사람 전원을 훑는 스케줄러용. */
    fun findAllByQuestionId(questionId: Long): List<Answer>

    /** 한 사람이 남긴 모든 답변, 최신순. 본인 전용 기록 조회용. */
    fun findAllByAccountId(accountId: UUID): List<Answer>
}
