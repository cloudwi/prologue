package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class AnswerPersistenceAdapter(
    private val jpa: AnswerJpaRepository,
) : AnswerRepository {

    override fun findByAccountIdAndQuestionId(accountId: UUID, questionId: Long): Answer? =
        jpa.findByAccountIdAndQuestionId(accountId, questionId)?.toDomain()

    override fun save(answer: Answer): Answer =
        jpa.save(answer.toEntity()).toDomain()

    private fun Answer.toEntity(): AnswerJpaEntity =
        AnswerJpaEntity(
            id = id,
            accountId = accountId,
            questionId = questionId,
            content = content,
            createdAt = createdAt,
        )

    private fun AnswerJpaEntity.toDomain(): Answer =
        Answer.reconstitute(
            id = requireNotNull(id) { "영속된 답변은 id를 가진다" },
            accountId = accountId,
            questionId = questionId,
            content = content,
            createdAt = createdAt,
        )
}
