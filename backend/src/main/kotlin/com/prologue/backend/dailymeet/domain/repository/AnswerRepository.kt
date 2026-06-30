package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Answer
import java.util.UUID

interface AnswerRepository {
    fun findByAccountIdAndQuestionId(accountId: UUID, questionId: Long): Answer?
    fun save(answer: Answer): Answer
}
