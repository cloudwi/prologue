package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface DailyRevealJpaRepository : JpaRepository<DailyRevealJpaEntity, UUID> {
    fun findAllByViewerAccountIdAndQuestionIdOrderByCreatedAtAsc(viewerAccountId: UUID, questionId: Long): List<DailyRevealJpaEntity>
    fun countByQuestionIdAndPeerAnswerId(questionId: Long, peerAnswerId: UUID): Long
    fun findByViewerAccountIdAndCreatedAtAfterOrderByCreatedAtDesc(
        viewerAccountId: UUID,
        since: java.time.Instant,
    ): List<DailyRevealJpaEntity>
}
