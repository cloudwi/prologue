package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.StampEventSubmission
import com.prologue.backend.dailymeet.domain.repository.StampEventSubmissionRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

interface StampEventSubmissionJpaRepository : JpaRepository<StampEventSubmissionJpaEntity, UUID> {
    fun findByAccountIdOrderByCreatedAtDesc(accountId: UUID): List<StampEventSubmissionJpaEntity>
    fun findByStatusOrderByCreatedAtAsc(status: String): List<StampEventSubmissionJpaEntity>
    fun existsByAccountIdAndStatus(accountId: UUID, status: String): Boolean
}

@Repository
class StampEventSubmissionPersistenceAdapter(
    private val jpa: StampEventSubmissionJpaRepository,
) : StampEventSubmissionRepository {

    override fun save(submission: StampEventSubmission): StampEventSubmission =
        jpa.save(
            StampEventSubmissionJpaEntity(
                id = submission.id,
                accountId = submission.accountId,
                url = submission.url,
                status = submission.status.name,
                grantedAmount = submission.grantedAmount,
                createdAt = submission.createdAt,
                decidedAt = submission.decidedAt,
            ),
        ).toDomain()

    override fun findById(id: UUID): StampEventSubmission? =
        jpa.findById(id).orElse(null)?.toDomain()

    override fun findByAccountId(accountId: UUID): List<StampEventSubmission> =
        jpa.findByAccountIdOrderByCreatedAtDesc(accountId).map { it.toDomain() }

    override fun findPending(): List<StampEventSubmission> =
        jpa.findByStatusOrderByCreatedAtAsc(StampEventSubmission.Status.PENDING.name).map { it.toDomain() }

    override fun existsPendingByAccountId(accountId: UUID): Boolean =
        jpa.existsByAccountIdAndStatus(accountId, StampEventSubmission.Status.PENDING.name)

    private fun StampEventSubmissionJpaEntity.toDomain(): StampEventSubmission =
        StampEventSubmission.reconstitute(
            id = id!!,
            accountId = accountId,
            url = url,
            status = StampEventSubmission.Status.valueOf(status),
            grantedAmount = grantedAmount,
            createdAt = createdAt,
            decidedAt = decidedAt,
        )
}
