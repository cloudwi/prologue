package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface DailyRevealJpaRepository : JpaRepository<DailyRevealJpaEntity, UUID> {
    fun findByViewerAccountIdAndQuestionId(viewerAccountId: UUID, questionId: Long): DailyRevealJpaEntity?
    fun countByQuestionIdAndPeerAnswerId(questionId: Long, peerAnswerId: UUID): Long
}
