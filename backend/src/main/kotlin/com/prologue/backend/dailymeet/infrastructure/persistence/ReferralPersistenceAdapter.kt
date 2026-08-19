package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.InviteCode
import com.prologue.backend.dailymeet.domain.model.Referral
import com.prologue.backend.dailymeet.domain.repository.InviteCodeRepository
import com.prologue.backend.dailymeet.domain.repository.ReferralRepository
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "invite_codes")
class InviteCodeJpaEntity(
    @Id @Column(name = "id", nullable = false, updatable = false) val id: UUID,
    @Column(name = "account_id", nullable = false, updatable = false) val accountId: UUID,
    @Column(name = "code", nullable = false, updatable = false, unique = true) val code: String,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant,
    @Column(name = "kind", nullable = false, updatable = false) val kind: String,
    @Column(name = "invitee_reward", updatable = false) val inviteeReward: Int?,
    @Column(name = "inviter_reward", updatable = false) val inviterReward: Int?,
    @Column(name = "max_uses", updatable = false) val maxUses: Int?,
)

interface InviteCodeJpaRepository : JpaRepository<InviteCodeJpaEntity, UUID> {
    fun findByCode(code: String): InviteCodeJpaEntity?
    fun findFirstByAccountIdAndKind(accountId: UUID, kind: String): InviteCodeJpaEntity?

    /**
     * 코드가 비어 있을 때만 넣는다 — DB가 판정한다. 넣었으면 1, 충돌이면 0.
     * 제약 위반을 예외로 받아 삼키면 Postgres 트랜잭션이 통째로 망가져(25P02) 그 뒤의 조회까지 죽는다.
     */
    @Modifying
    @Query(
        value = """
        insert into invite_codes (id, account_id, code, created_at, kind, invitee_reward, inviter_reward, max_uses)
        values (:id, :accountId, :code, :createdAt, :kind, :inviteeReward, :inviterReward, :maxUses)
        on conflict (code) do nothing
        """,
        nativeQuery = true,
    )
    fun insertIfCodeFree(
        @Param("id") id: UUID,
        @Param("accountId") accountId: UUID,
        @Param("code") code: String,
        @Param("createdAt") createdAt: Instant,
        @Param("kind") kind: String,
        @Param("inviteeReward") inviteeReward: Int?,
        @Param("inviterReward") inviterReward: Int?,
        @Param("maxUses") maxUses: Int?,
    ): Int
}

@Entity
@Table(name = "referrals")
class ReferralJpaEntity(
    @Id @Column(name = "id", nullable = false, updatable = false) val id: UUID,
    @Column(name = "inviter_account_id", nullable = false, updatable = false) val inviterAccountId: UUID,
    @Column(name = "invitee_account_id", nullable = false, updatable = false, unique = true) val inviteeAccountId: UUID,
    @Column(name = "code", updatable = false) val code: String?,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant,
)

interface ReferralJpaRepository : JpaRepository<ReferralJpaEntity, UUID> {
    fun countByInviterAccountIdAndCode(inviterAccountId: UUID, code: String): Long
    fun countByCode(code: String): Long
    fun existsByInviteeAccountId(inviteeAccountId: UUID): Boolean

    /** 이 invitee의 첫 초대만 남는다 — 같은 순간 두 번 들어와도 DB가 하나만 받는다. 넣었으면 1. */
    @Modifying
    @Query(
        value = """
        insert into referrals (id, inviter_account_id, invitee_account_id, code, created_at)
        values (:id, :inviterAccountId, :inviteeAccountId, :code, :createdAt)
        on conflict (invitee_account_id) do nothing
        """,
        nativeQuery = true,
    )
    fun insertIfNew(
        @Param("id") id: UUID,
        @Param("inviterAccountId") inviterAccountId: UUID,
        @Param("inviteeAccountId") inviteeAccountId: UUID,
        @Param("code") code: String,
        @Param("createdAt") createdAt: Instant,
    ): Int
}

/**
 * 초대 코드·초대 기록 어댑터. 유일성(코드, invitee)의 판정은 DB의 `on conflict do nothing`이 한다 —
 * 제약 위반 예외를 잡아 넘기는 방식은 Postgres에서 트랜잭션을 중단 상태로 만들어 그 뒤 조회까지 실패한다.
 */
@Repository
class ReferralPersistenceAdapter(
    private val codes: InviteCodeJpaRepository,
    private val referrals: ReferralJpaRepository,
) : InviteCodeRepository, ReferralRepository {

    /** 개인 코드만 — 운영자의 특별 코드는 그 사람의 "내 코드"가 아니다. */
    override fun findByAccountId(accountId: UUID): InviteCode? =
        codes.findFirstByAccountIdAndKind(accountId, InviteCode.Kind.PERSONAL.name)?.toDomain()

    override fun findByCode(code: String): InviteCode? = codes.findByCode(code)?.toDomain()

    override fun saveIfCodeFree(inviteCode: InviteCode): Boolean =
        codes.insertIfCodeFree(
            id = UUID.randomUUID(),
            accountId = inviteCode.accountId,
            code = inviteCode.code,
            createdAt = inviteCode.createdAt,
            kind = inviteCode.kind.name,
            inviteeReward = inviteCode.inviteeReward,
            inviterReward = inviteCode.inviterReward,
            maxUses = inviteCode.maxUses,
        ) == 1

    override fun saveIfNew(referral: Referral): Boolean =
        referrals.insertIfNew(referral.id, referral.inviterAccountId, referral.inviteeAccountId, referral.code, referral.createdAt) == 1

    override fun countByInviterAndCode(inviterAccountId: UUID, code: String): Long =
        referrals.countByInviterAccountIdAndCode(inviterAccountId, code)

    override fun countByCode(code: String): Long = referrals.countByCode(code)

    override fun existsByInvitee(inviteeAccountId: UUID): Boolean = referrals.existsByInviteeAccountId(inviteeAccountId)

    private fun InviteCodeJpaEntity.toDomain() = InviteCode.reconstitute(
        accountId, code, createdAt, InviteCode.Kind.valueOf(kind), inviteeReward, inviterReward, maxUses,
    )
}
