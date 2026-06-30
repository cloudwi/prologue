package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface AnswerJpaRepository : JpaRepository<AnswerJpaEntity, UUID> {
    fun findByAccountIdAndQuestionId(accountId: UUID, questionId: Long): AnswerJpaEntity?

    fun findFirstByQuestionIdAndAccountIdNotOrderByCreatedAtDesc(
        questionId: Long,
        accountId: UUID,
    ): AnswerJpaEntity?

    fun findByQuestionIdAndAccountIdNot(questionId: Long, accountId: UUID): List<AnswerJpaEntity>
}
