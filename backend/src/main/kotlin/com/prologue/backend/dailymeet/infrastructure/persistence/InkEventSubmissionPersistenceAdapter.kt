package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.InkEventSubmission
import com.prologue.backend.dailymeet.domain.repository.InkEventSubmissionRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

interface InkEventSubmissionJpaRepository : JpaRepository<InkEventSubmissionJpaEntity, UUID> {
    fun findByAccountIdOrderByCreatedAtDesc(accountId: UUID): List<InkEventSubmissionJpaEntity>
    fun findByStatusOrderByCreatedAtAsc(status: String): List<InkEventSubmissionJpaEntity>
    fun existsByAccountIdAndStatus(accountId: UUID, status: String): Boolean
}

@Repository
class InkEventSubmissionPersistenceAdapter(
    private val jpa: InkEventSubmissionJpaRepository,
) : InkEventSubmissionRepository {

    override fun save(submission: InkEventSubmission): InkEventSubmission =
        jpa.save(
            InkEventSubmissionJpaEntity(
                id = submission.id,
                accountId = submission.accountId,
                url = submission.url,
                status = submission.status.name,
                grantedAmount = submission.grantedAmount,
                createdAt = submission.createdAt,
                decidedAt = submission.decidedAt,
            ),
        ).toDomain()

    override fun findById(id: UUID): InkEventSubmission? =
        jpa.findById(id).orElse(null)?.toDomain()

    override fun findByAccountId(accountId: UUID): List<InkEventSubmission> =
        jpa.findByAccountIdOrderByCreatedAtDesc(accountId).map { it.toDomain() }

    override fun findPending(): List<InkEventSubmission> =
        jpa.findByStatusOrderByCreatedAtAsc(InkEventSubmission.Status.PENDING.name).map { it.toDomain() }

    override fun existsPendingByAccountId(accountId: UUID): Boolean =
        jpa.existsByAccountIdAndStatus(accountId, InkEventSubmission.Status.PENDING.name)

    private fun InkEventSubmissionJpaEntity.toDomain(): InkEventSubmission =
        InkEventSubmission.reconstitute(
            id = id!!,
            accountId = accountId,
            url = url,
            status = InkEventSubmission.Status.valueOf(status),
            grantedAmount = grantedAmount,
            createdAt = createdAt,
            decidedAt = decidedAt,
        )
}
