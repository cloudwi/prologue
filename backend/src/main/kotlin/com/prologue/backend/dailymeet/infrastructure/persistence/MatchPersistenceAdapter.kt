package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Match
import com.prologue.backend.dailymeet.domain.repository.MatchRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class MatchPersistenceAdapter(
    private val jpa: MatchJpaRepository,
) : MatchRepository {

    override fun save(match: Match): Match =
        jpa.save(match.toEntity()).toDomain()

    override fun exists(accountLow: UUID, accountHigh: UUID, questionId: Long): Boolean =
        jpa.existsByAccountLowAndAccountHighAndQuestionId(accountLow, accountHigh, questionId)

    override fun findByAccount(accountId: UUID): List<Match> =
        jpa.findByAccountLowOrAccountHighOrderByCreatedAtDesc(accountId, accountId).map { it.toDomain() }

    private fun Match.toEntity(): MatchJpaEntity =
        MatchJpaEntity(
            id = id,
            accountLow = accountLow,
            accountHigh = accountHigh,
            questionId = questionId,
            createdAt = createdAt,
        )

    private fun MatchJpaEntity.toDomain(): Match =
        Match.reconstitute(
            id = requireNotNull(id) { "영속된 매칭은 id를 가진다" },
            accountLow = accountLow,
            accountHigh = accountHigh,
            questionId = questionId,
            createdAt = createdAt,
        )
}
