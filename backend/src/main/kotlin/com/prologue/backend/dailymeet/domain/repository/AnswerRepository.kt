package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Answer
import java.util.UUID

interface AnswerRepository {
    fun findByAccountIdAndQuestionId(accountId: UUID, questionId: Long): Answer?
    fun findById(id: UUID): Answer?
    fun save(answer: Answer): Answer

    /** 같은 질문에 대한 '나 외의' 답변 하나(최신). 블라인드 상대 답변용. */
    fun findOtherAnswer(questionId: Long, excludeAccountId: UUID): Answer?
}
