package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ConversationJpaRepository : JpaRepository<ConversationJpaEntity, UUID> {
    fun existsByAccountLowAndAccountHigh(accountLow: UUID, accountHigh: UUID): Boolean
    fun findByAccountLowAndAccountHigh(accountLow: UUID, accountHigh: UUID): ConversationJpaEntity?
    fun findByAccountLowOrAccountHighOrderByCreatedAtDesc(accountLow: UUID, accountHigh: UUID): List<ConversationJpaEntity>
}
