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

    override fun findById(id: UUID): Answer? =
        jpa.findById(id).orElse(null)?.toDomain()

    override fun save(answer: Answer): Answer =
        jpa.save(answer.toEntity()).toDomain()

    override fun findOtherAnswer(questionId: Long, excludeAccountId: UUID): Answer? =
        jpa.findFirstByQuestionIdAndAccountIdNotOrderByCreatedAtDesc(questionId, excludeAccountId)?.toDomain()

    override fun findOthers(questionId: Long, excludeAccountId: UUID): List<Answer> =
        jpa.findByQuestionIdAndAccountIdNot(questionId, excludeAccountId).map { it.toDomain() }

    override fun findOthersByQuestionIds(questionIds: List<Long>, excludeAccountId: UUID): List<Answer> =
        if (questionIds.isEmpty()) emptyList()
        else jpa.findByQuestionIdInAndAccountIdNot(questionIds, excludeAccountId).map { it.toDomain() }

    override fun findOthersAnsweredSince(since: java.time.Instant, excludeAccountId: UUID): List<Answer> =
        jpa.findByCreatedAtAfterAndAccountIdNotOrderByCreatedAtDesc(since, excludeAccountId).map { it.toDomain() }

    override fun findAllByQuestionId(questionId: Long): List<Answer> =
        jpa.findByQuestionId(questionId).map { it.toDomain() }

    override fun findAllByAccountId(accountId: UUID): List<Answer> =
        jpa.findByAccountIdOrderByCreatedAtDesc(accountId).map { it.toDomain() }

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
