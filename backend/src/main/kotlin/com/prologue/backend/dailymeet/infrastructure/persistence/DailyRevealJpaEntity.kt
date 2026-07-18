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
    name = "daily_reveals",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uq_daily_reveal_viewer_question_peer",
            columnNames = ["viewer_account_id", "question_id", "peer_answer_id"],
        ),
    ],
)
class DailyRevealJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "viewer_account_id", nullable = false)
    val viewerAccountId: UUID,

    @Column(name = "question_id", nullable = false)
    val questionId: Long,

    @Column(name = "peer_answer_id", nullable = false)
    val peerAnswerId: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
