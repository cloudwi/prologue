package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.repository.TasteRewardRepository
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.persistence.EntityManager
import com.prologue.backend.dailymeet.domain.model.TasteReward
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** (계정, 이정표)가 곧 키다 — 같은 이정표를 두 번 밟을 수는 없다. */
@Embeddable
data class TasteRewardId(
    @Column(name = "account_id", nullable = false)
    val accountId: UUID = UUID(0, 0),

    @Column(name = "milestone", nullable = false)
    val milestone: Int = 0,
) : java.io.Serializable

@Entity
@Table(name = "taste_rewards")
class TasteRewardJpaEntity(
    @EmbeddedId
    val id: TasteRewardId,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    /** 소개로 바뀐 시각. null이면 아직 쓰이지 않은 표다. */
    @Column(name = "granted_at")
    var grantedAt: Instant? = null,
)

/*
 * 키가 @EmbeddedId라 파생 쿼리는 실행 시점에 터진다 — 경로를 명시한다(meetup_follows에서 겪은 함정).
 */
interface TasteRewardJpaRepository : JpaRepository<TasteRewardJpaEntity, TasteRewardId> {
    @Query("select count(r) from TasteRewardJpaEntity r where r.id.accountId = :accountId and r.grantedAt >= :since")
    fun countGrantedSince(@Param("accountId") accountId: UUID, @Param("since") since: Instant): Long

    @Query("select r.id.milestone from TasteRewardJpaEntity r where r.id.accountId = :accountId")
    fun findMilestones(@Param("accountId") accountId: UUID): List<Int>

    @Query("select r from TasteRewardJpaEntity r where r.id.accountId = :accountId and r.grantedAt is null order by r.createdAt asc, r.id.milestone asc")
    fun findPending(@Param("accountId") accountId: UUID): List<TasteRewardJpaEntity>

    @Query("select count(r) from TasteRewardJpaEntity r where r.id.accountId = :accountId and r.createdAt >= :since")
    fun countSince(@Param("accountId") accountId: UUID, @Param("since") since: Instant): Long
}

@Repository
class TasteRewardPersistenceAdapter(
    private val jpa: TasteRewardJpaRepository,
    private val entityManager: EntityManager,
) : TasteRewardRepository {

    @Transactional
    override fun claimIfNew(accountId: UUID, milestone: Int): Boolean {
        return entityManager.createNativeQuery(
            "insert into taste_rewards (account_id, milestone, created_at) values (:account, :milestone, now()) on conflict do nothing"
        ).setParameter("account", accountId).setParameter("milestone", milestone).executeUpdate() == 1
    }

    override fun claimedMilestones(accountId: UUID): List<Int> = jpa.findMilestones(accountId)

    @Transactional
    override fun claimEarned(accountId: UUID, answered: Int, since: Instant, dailyLimit: Int): Boolean {
        // 잠금은 트랜잭션 종료까지 유지된다. 다른 카드의 동시 저장도 하루 한도를 넘기지 못한다.
        lockAccount(accountId)
        if (claimedSince(accountId, since) >= dailyLimit) return false
        val claimed = claimedMilestones(accountId).toSet()
        val next = (TasteReward.EVERY..answered step TasteReward.EVERY).firstOrNull { it !in claimed } ?: return false
        return claimIfNew(accountId, next)
    }

    @Transactional
    override fun lockAccount(accountId: UUID) {
        entityManager.createNativeQuery("select pg_advisory_xact_lock(cast(:key as bigint))")
            .setParameter("key", accountId.mostSignificantBits xor accountId.leastSignificantBits).resultList
    }

    override fun grantedSince(accountId: UUID, since: Instant): Int = jpa.countGrantedSince(accountId, since).toInt()

    override fun pendingCount(accountId: UUID): Int = jpa.findPending(accountId).size

    override fun claimedSince(accountId: UUID, since: Instant): Int = jpa.countSince(accountId, since).toInt()

    @Transactional
    override fun markGranted(accountId: UUID, count: Int) {
        if (count <= 0) return
        val now = Instant.now()
        jpa.findPending(accountId).take(count).forEach { it.grantedAt = now }
    }
}
