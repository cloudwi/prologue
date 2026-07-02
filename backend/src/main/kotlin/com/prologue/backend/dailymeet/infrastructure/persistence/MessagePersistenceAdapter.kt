package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Message
import com.prologue.backend.dailymeet.domain.repository.MessageRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class MessagePersistenceAdapter(
    private val jpa: MessageJpaRepository,
) : MessageRepository {

    override fun save(message: Message): Message =
        jpa.save(message.toEntity()).toDomain()

    override fun findByConversationOrdered(conversationId: UUID): List<Message> =
        jpa.findByConversationIdOrderByCreatedAtAsc(conversationId).map { it.toDomain() }

    private fun Message.toEntity(): MessageJpaEntity =
        MessageJpaEntity(
            id = id,
            conversationId = conversationId,
            senderAccountId = senderAccountId,
            content = content,
            createdAt = createdAt,
        )

    private fun MessageJpaEntity.toDomain(): Message =
        Message.reconstitute(
            id = requireNotNull(id),
            conversationId = conversationId,
            senderAccountId = senderAccountId,
            content = content,
            createdAt = createdAt,
        )
}
