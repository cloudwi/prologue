package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.DailyReveal
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class DailyRevealPersistenceAdapter(
    private val jpa: DailyRevealJpaRepository,
) : DailyRevealRepository {

    override fun findAllByViewerAndQuestion(viewerAccountId: UUID, questionId: Long): List<DailyReveal> =
        jpa.findAllByViewerAccountIdAndQuestionIdOrderByCreatedAtAsc(viewerAccountId, questionId).map { it.toDomain() }

    override fun save(reveal: DailyReveal): DailyReveal =
        jpa.save(reveal.toEntity()).toDomain()

    override fun countByQuestionAndPeerAnswer(questionId: Long, peerAnswerId: UUID): Long =
        jpa.countByQuestionIdAndPeerAnswerId(questionId, peerAnswerId)

    private fun DailyReveal.toEntity(): DailyRevealJpaEntity =
        DailyRevealJpaEntity(
            id = id,
            viewerAccountId = viewerAccountId,
            questionId = questionId,
            peerAnswerId = peerAnswerId,
            createdAt = createdAt,
        )

    private fun DailyRevealJpaEntity.toDomain(): DailyReveal =
        DailyReveal.reconstitute(
            id = requireNotNull(id) { "영속된 노출 기록은 id를 가진다" },
            viewerAccountId = viewerAccountId,
            questionId = questionId,
            peerAnswerId = peerAnswerId,
            createdAt = createdAt,
        )
}
