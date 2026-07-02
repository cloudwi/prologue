package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.ConversationRequestStatus
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ConversationRequestJpaRepository : JpaRepository<ConversationRequestJpaEntity, UUID> {
    fun existsByRequesterAccountIdAndAddresseeAccountIdAndStatus(
        requesterAccountId: UUID,
        addresseeAccountId: UUID,
        status: ConversationRequestStatus,
    ): Boolean

    fun findByAddresseeAccountIdAndStatusOrderByCreatedAtDesc(
        addresseeAccountId: UUID,
        status: ConversationRequestStatus,
    ): List<ConversationRequestJpaEntity>
}
