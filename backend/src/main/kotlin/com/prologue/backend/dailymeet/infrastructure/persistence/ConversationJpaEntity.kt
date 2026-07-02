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
    name = "conversations",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_conversation_pair", columnNames = ["account_low", "account_high"]),
    ],
)
class ConversationJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "account_low", nullable = false)
    val accountLow: UUID,

    @Column(name = "account_high", nullable = false)
    val accountHigh: UUID,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
