package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface HeartJpaRepository : JpaRepository<HeartJpaEntity, UUID> {
    fun existsByFromAccountIdAndToAccountIdAndQuestionId(
        fromAccountId: UUID,
        toAccountId: UUID,
        questionId: Long,
    ): Boolean
}
