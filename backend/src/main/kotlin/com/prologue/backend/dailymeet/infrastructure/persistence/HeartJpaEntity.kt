package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.UuidGenerator
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "hearts",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_heart_from_to_question", columnNames = ["from_account_id", "to_account_id", "question_id"]),
    ],
)
class HeartJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "from_account_id", nullable = false)
    val fromAccountId: UUID,

    @Column(name = "to_account_id", nullable = false)
    val toAccountId: UUID,

    @Column(name = "question_id", nullable = false)
    val questionId: Long,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
