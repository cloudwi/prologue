package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.UuidGenerator
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "ink_event_submissions")
class InkEventSubmissionJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "account_id", nullable = false, updatable = false)
    val accountId: UUID,

    @Column(name = "url", nullable = false, length = 500, updatable = false)
    val url: String,

    @Column(name = "status", nullable = false, length = 20)
    var status: String,

    @Column(name = "granted_amount")
    var grantedAmount: Int?,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,

    @Column(name = "decided_at")
    var decidedAt: Instant?,
)
