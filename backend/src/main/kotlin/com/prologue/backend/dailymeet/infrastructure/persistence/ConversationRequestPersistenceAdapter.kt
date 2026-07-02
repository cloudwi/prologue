package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.ConversationRequest
import com.prologue.backend.dailymeet.domain.model.ConversationRequestStatus
import com.prologue.backend.dailymeet.domain.repository.ConversationRequestRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ConversationRequestPersistenceAdapter(
    private val jpa: ConversationRequestJpaRepository,
) : ConversationRequestRepository {

    override fun save(request: ConversationRequest): ConversationRequest =
        jpa.save(request.toEntity()).toDomain()

    override fun findById(id: UUID): ConversationRequest? =
        jpa.findById(id).orElse(null)?.toDomain()

    override fun existsPending(requesterAccountId: UUID, addresseeAccountId: UUID): Boolean =
        jpa.existsByRequesterAccountIdAndAddresseeAccountIdAndStatus(
            requesterAccountId, addresseeAccountId, ConversationRequestStatus.PENDING,
        )

    override fun findPendingByAddressee(addresseeAccountId: UUID): List<ConversationRequest> =
        jpa.findByAddresseeAccountIdAndStatusOrderByCreatedAtDesc(addresseeAccountId, ConversationRequestStatus.PENDING)
            .map { it.toDomain() }

    private fun ConversationRequest.toEntity(): ConversationRequestJpaEntity =
        ConversationRequestJpaEntity(
            id = id,
            requesterAccountId = requesterAccountId,
            addresseeAccountId = addresseeAccountId,
            questionId = questionId,
            status = status,
            createdAt = createdAt,
            respondedAt = respondedAt,
        )

    private fun ConversationRequestJpaEntity.toDomain(): ConversationRequest =
        ConversationRequest.reconstitute(
            id = requireNotNull(id),
            requesterAccountId = requesterAccountId,
            addresseeAccountId = addresseeAccountId,
            questionId = questionId,
            status = status,
            createdAt = createdAt,
            respondedAt = respondedAt,
        )
}
