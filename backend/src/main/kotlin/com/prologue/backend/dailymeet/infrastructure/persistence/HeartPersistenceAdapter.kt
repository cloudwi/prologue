package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class HeartPersistenceAdapter(
    private val jpa: HeartJpaRepository,
) : HeartRepository {

    override fun save(heart: Heart): Heart =
        jpa.save(heart.toEntity()).toDomain()

    override fun exists(fromAccountId: UUID, toAccountId: UUID, questionId: Long): Boolean =
        jpa.existsByFromAccountIdAndToAccountIdAndQuestionId(fromAccountId, toAccountId, questionId)

    override fun existsFromTo(fromAccountId: UUID, toAccountId: UUID): Boolean =
        jpa.existsByFromAccountIdAndToAccountId(fromAccountId, toAccountId)

    override fun findAllTo(toAccountId: UUID): List<Heart> =
        jpa.findByToAccountIdOrderByCreatedAtDesc(toAccountId).map { it.toDomain() }

    override fun findAllFrom(fromAccountId: UUID): List<Heart> =
        jpa.findByFromAccountIdOrderByCreatedAtDesc(fromAccountId).map { it.toDomain() }

    override fun countFrom(fromAccountId: UUID): Long = jpa.countByFromAccountId(fromAccountId)

    /**
     * 보낸 하트와 받은 하트를 각각 읽어 상대별 최신 시각으로 접는다.
     * 한 사람이 주고받는 하트는 많아야 수십 건이라, 방향별 한 번씩 두 질의면 충분하다.
     */
    override fun findLastHeartedAtByPeer(accountId: UUID): Map<UUID, java.time.Instant> {
        val sent = jpa.findByFromAccountId(accountId).map { it.toAccountId to it.createdAt }
        val received = jpa.findByToAccountIdOrderByCreatedAtDesc(accountId).map { it.fromAccountId to it.createdAt }
        return (sent + received)
            .groupBy({ it.first }, { it.second })
            .mapValues { (_, times) -> times.max() }
    }

    private fun Heart.toEntity(): HeartJpaEntity =
        HeartJpaEntity(
            id = id,
            fromAccountId = fromAccountId,
            toAccountId = toAccountId,
            questionId = questionId,
            createdAt = createdAt,
        )

    private fun HeartJpaEntity.toDomain(): Heart =
        Heart.reconstitute(
            id = requireNotNull(id) { "영속된 하트는 id를 가진다" },
            fromAccountId = fromAccountId,
            toAccountId = toAccountId,
            questionId = questionId,
            createdAt = createdAt,
        )
}
