package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface HeartJpaRepository : JpaRepository<HeartJpaEntity, UUID> {
    fun existsByFromAccountIdAndToAccountId(fromAccountId: UUID, toAccountId: UUID): Boolean
    fun findByToAccountIdOrderByCreatedAtDesc(toAccountId: UUID): List<HeartJpaEntity>
    fun countByFromAccountId(fromAccountId: UUID): Long
    fun existsByFromAccountIdAndToAccountIdAndQuestionId(
        fromAccountId: UUID,
        toAccountId: UUID,
        questionId: Long,
    ): Boolean

    fun findByFromAccountId(fromAccountId: UUID): List<HeartJpaEntity>
}
