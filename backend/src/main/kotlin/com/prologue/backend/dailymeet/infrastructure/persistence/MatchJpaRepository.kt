package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface MatchJpaRepository : JpaRepository<MatchJpaEntity, UUID> {
    fun existsByAccountLowAndAccountHighAndQuestionId(
        accountLow: UUID,
        accountHigh: UUID,
        questionId: Long,
    ): Boolean

    fun findByAccountLowOrAccountHighOrderByCreatedAtDesc(
        accountLow: UUID,
        accountHigh: UUID,
    ): List<MatchJpaEntity>
}
