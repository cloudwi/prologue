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
@Table(name = "messages")
class MessageJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "conversation_id", nullable = false)
    val conversationId: UUID,

    @Column(name = "sender_account_id", nullable = false)
    val senderAccountId: UUID,

    @Column(name = "content", nullable = false, length = 1000)
    val content: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
