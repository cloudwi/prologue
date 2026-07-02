package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Conversation
import com.prologue.backend.dailymeet.domain.repository.ConversationRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ConversationPersistenceAdapter(
    private val jpa: ConversationJpaRepository,
) : ConversationRepository {

    override fun save(conversation: Conversation): Conversation =
        jpa.save(conversation.toEntity()).toDomain()

    override fun existsBetween(accountLow: UUID, accountHigh: UUID): Boolean =
        jpa.existsByAccountLowAndAccountHigh(accountLow, accountHigh)

    override fun findByAccount(accountId: UUID): List<Conversation> =
        jpa.findByAccountLowOrAccountHighOrderByCreatedAtDesc(accountId, accountId).map { it.toDomain() }

    private fun Conversation.toEntity(): ConversationJpaEntity =
        ConversationJpaEntity(id = id, accountLow = accountLow, accountHigh = accountHigh, createdAt = createdAt)

    private fun ConversationJpaEntity.toDomain(): Conversation =
        Conversation.reconstitute(
            id = requireNotNull(id),
            accountLow = accountLow,
            accountHigh = accountHigh,
            createdAt = createdAt,
        )
}
