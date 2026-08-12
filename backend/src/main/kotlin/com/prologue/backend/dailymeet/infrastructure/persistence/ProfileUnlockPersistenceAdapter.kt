package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.ProfileUnlock
import com.prologue.backend.dailymeet.domain.repository.ProfileUnlockRepository
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

/** profile_unlocks 매핑. 한번 저장하면 갱신하지 않는 append-only 기록. */
@Entity
@Table(name = "profile_unlocks")
class ProfileUnlockJpaEntity(
    @Id @Column(name = "id", nullable = false, updatable = false) val id: UUID,
    @Column(name = "account_id", nullable = false, updatable = false) val accountId: UUID,
    @Column(name = "peer_account_id", nullable = false, updatable = false) val peerAccountId: UUID,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant,
)

interface ProfileUnlockJpaRepository : JpaRepository<ProfileUnlockJpaEntity, UUID> {
    fun existsByAccountIdAndPeerAccountId(accountId: UUID, peerAccountId: UUID): Boolean
    fun findByAccountId(accountId: UUID): List<ProfileUnlockJpaEntity>
}

/**
 * 열람권 어댑터.
 *
 * 중복은 조회로 먼저 걸러내되, 최종 판정은 DB 유니크 제약에 맡긴다.
 * 두 요청이 같은 순간에 들어오면 조회는 둘 다 "없음"을 볼 수 있다 — 그 틈은 제약만이 막는다.
 */
@Repository
class ProfileUnlockPersistenceAdapter(
    private val jpa: ProfileUnlockJpaRepository,
) : ProfileUnlockRepository {

    override fun saveIfNew(unlock: ProfileUnlock): Boolean {
        if (jpa.existsByAccountIdAndPeerAccountId(unlock.accountId, unlock.peerAccountId)) return false
        return try {
            jpa.saveAndFlush(unlock.toEntity())
            true
        } catch (e: DataIntegrityViolationException) {
            false // 동시에 들어온 같은 요청 — 먼저 온 쪽만 우표를 쓴다
        }
    }

    override fun findPeerAccountIds(accountId: UUID): Set<UUID> =
        jpa.findByAccountId(accountId).map { it.peerAccountId }.toSet()

    private fun ProfileUnlock.toEntity() = ProfileUnlockJpaEntity(
        id = id,
        accountId = accountId,
        peerAccountId = peerAccountId,
        createdAt = createdAt,
    )
}
