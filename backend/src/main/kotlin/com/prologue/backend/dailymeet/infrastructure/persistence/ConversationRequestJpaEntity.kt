package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.ConversationRequestStatus
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.UuidGenerator
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "conversation_requests",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_conv_req", columnNames = ["requester_account_id", "addressee_account_id", "question_id"]),
    ],
)
class ConversationRequestJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "requester_account_id", nullable = false)
    val requesterAccountId: UUID,

    @Column(name = "addressee_account_id", nullable = false)
    val addresseeAccountId: UUID,

    @Column(name = "question_id", nullable = false)
    val questionId: Long,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    var status: ConversationRequestStatus,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,

    @Column(name = "responded_at")
    var respondedAt: Instant? = null,
)
