package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class HeartPersistenceAdapter(
    private val jpa: HeartJpaRepository,
) : HeartRepository {

    override fun save(heart: Heart): Heart =
        jpa.save(heart.toEntity()).toDomain()

    override fun exists(fromAccountId: UUID, toAccountId: UUID, questionId: Long): Boolean =
        jpa.existsByFromAccountIdAndToAccountIdAndQuestionId(fromAccountId, toAccountId, questionId)

    override fun existsFromTo(fromAccountId: UUID, toAccountId: UUID): Boolean =
        jpa.existsByFromAccountIdAndToAccountId(fromAccountId, toAccountId)

    override fun findAllTo(toAccountId: UUID): List<Heart> =
        jpa.findByToAccountIdOrderByCreatedAtDesc(toAccountId).map { it.toDomain() }

    private fun Heart.toEntity(): HeartJpaEntity =
        HeartJpaEntity(
            id = id,
            fromAccountId = fromAccountId,
            toAccountId = toAccountId,
            questionId = questionId,
            createdAt = createdAt,
        )

    private fun HeartJpaEntity.toDomain(): Heart =
        Heart.reconstitute(
            id = requireNotNull(id) { "영속된 하트는 id를 가진다" },
            fromAccountId = fromAccountId,
            toAccountId = toAccountId,
            questionId = questionId,
            createdAt = createdAt,
        )
}
