package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface MessageJpaRepository : JpaRepository<MessageJpaEntity, UUID> {
    fun findByConversationIdOrderByCreatedAtAsc(conversationId: UUID): List<MessageJpaEntity>
}
