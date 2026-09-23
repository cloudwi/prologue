package com.prologue.backend.member.infrastructure.persistence

import com.prologue.backend.member.domain.model.GateStatus
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.MemberGate
import com.prologue.backend.member.domain.repository.MemberGateRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

interface MemberGateJpaRepository : JpaRepository<MemberGateJpaEntity, UUID> {
    @Query("select g.accountId from MemberGateJpaEntity g where g.status = :status")
    fun findAccountIdsByStatus(@Param("status") status: GateStatus): List<UUID>

    fun findAllByStatusOrderByQueuedAtAsc(status: GateStatus, pageable: org.springframework.data.domain.Pageable): List<MemberGateJpaEntity>

    fun countByStatus(status: GateStatus): Long

    /** 나보다 먼저 줄을 선 사람 수 — 같은 시각이면 계정 id 순서로 갈라 두 사람이 같은 번호를 받지 않게. */
    @Query(
        """
        select count(*) from member_gate o, member_gate me
        where me.account_id = :accountId and me.status = 'WAITING' and o.status = 'WAITING'
          and (o.queued_at < me.queued_at or (o.queued_at = me.queued_at and o.account_id < me.account_id))
        """,
        nativeQuery = true,
    )
    fun countAhead(@Param("accountId") accountId: UUID): Long

    /** 활성 회원의 성별 분포 — 계정이 살아 있고(ACTIVE) 최근에 접속한 프로필만. */
    @Query(
        """
        select m.gender as gender, count(*) as cnt
        from members m join accounts a on a.id = m.account_id
        where a.status = 'ACTIVE' and a.last_seen_at >= :since
        group by m.gender
        """,
        nativeQuery = true,
    )
    fun countActiveByGender(@Param("since") since: Instant): List<Array<Any>>
}

/** MemberGateRepository 포트의 JPA 어댑터. */
@Repository
class MemberGatePersistenceAdapter(
    private val jpa: MemberGateJpaRepository,
) : MemberGateRepository {

    override fun save(gate: MemberGate): MemberGate = jpa.save(gate.toEntity()).toDomain()

    override fun findByAccountId(accountId: UUID): MemberGate? = jpa.findById(accountId).orElse(null)?.toDomain()

    override fun findAllWaitingIds(): Set<UUID> = jpa.findAccountIdsByStatus(GateStatus.WAITING).toSet()

    override fun findWaitingOrdered(limit: Int): List<MemberGate> {
        if (limit <= 0) return emptyList()
        return jpa.findAllByStatusOrderByQueuedAtAsc(GateStatus.WAITING, PageRequest.of(0, limit)).map { it.toDomain() }
    }

    override fun countWaiting(): Int = jpa.countByStatus(GateStatus.WAITING).toInt()

    override fun waitingPosition(accountId: UUID): Int? {
        val me = jpa.findById(accountId).orElse(null) ?: return null
        if (me.status != GateStatus.WAITING) return null
        return jpa.countAhead(accountId).toInt() + 1
    }

    override fun countActiveByGender(since: Instant): Map<Gender, Int> =
        jpa.countActiveByGender(since).associate { row ->
            Gender.valueOf(row[0] as String) to (row[1] as Number).toInt()
        }

    private fun MemberGate.toEntity() = MemberGateJpaEntity(
        accountId = accountId,
        status = status,
        queuedAt = queuedAt,
        admittedAt = admittedAt,
        admittedBy = admittedBy,
    )

    private fun MemberGateJpaEntity.toDomain() = MemberGate.reconstitute(
        accountId = accountId,
        status = status,
        queuedAt = queuedAt,
        admittedAt = admittedAt,
        admittedBy = admittedBy,
    )
}
