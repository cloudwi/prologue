package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Report
import com.prologue.backend.dailymeet.domain.repository.ReportRepository
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.UuidGenerator
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "reports")
class ReportJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "reporter_account_id", nullable = false)
    val reporterAccountId: UUID,

    @Column(name = "reported_account_id", nullable = false)
    val reportedAccountId: UUID,

    @Column(name = "context", nullable = false, length = 10)
    val context: String,

    @Column(name = "reason", nullable = false, length = 20)
    val reason: String,

    @Column(name = "snapshot", length = 1000)
    val snapshot: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)

interface ReportJpaRepository : JpaRepository<ReportJpaEntity, UUID> {
    fun findTop100ByOrderByCreatedAtDesc(): List<ReportJpaEntity>
}

@Repository
class ReportPersistenceAdapter(
    private val jpa: ReportJpaRepository,
) : ReportRepository {

    override fun save(report: Report): Report =
        jpa.save(
            ReportJpaEntity(
                id = report.id,
                reporterAccountId = report.reporterAccountId,
                reportedAccountId = report.reportedAccountId,
                context = report.context,
                reason = report.reason,
                snapshot = report.snapshot,
                createdAt = report.createdAt,
            ),
        ).toDomain()

    override fun findRecent(limit: Int): List<Report> =
        jpa.findTop100ByOrderByCreatedAtDesc().take(limit).map { it.toDomain() }

    private fun ReportJpaEntity.toDomain(): Report =
        Report.reconstitute(
            id = requireNotNull(id) { "영속된 신고는 id를 가진다" },
            reporterAccountId = reporterAccountId,
            reportedAccountId = reportedAccountId,
            context = context,
            reason = reason,
            snapshot = snapshot,
            createdAt = createdAt,
        )
}
