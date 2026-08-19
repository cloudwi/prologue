package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.InviteCode
import com.prologue.backend.dailymeet.domain.model.Referral
import com.prologue.backend.dailymeet.domain.repository.InviteCodeRepository
import com.prologue.backend.dailymeet.domain.repository.ReferralRepository
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "invite_codes")
class InviteCodeJpaEntity(
    @Id @Column(name = "account_id", nullable = false, updatable = false) val accountId: UUID,
    @Column(name = "code", nullable = false, updatable = false, unique = true) val code: String,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant,
)

interface InviteCodeJpaRepository : JpaRepository<InviteCodeJpaEntity, UUID> {
    fun findByCode(code: String): InviteCodeJpaEntity?
}

@Entity
@Table(name = "referrals")
class ReferralJpaEntity(
    @Id @Column(name = "id", nullable = false, updatable = false) val id: UUID,
    @Column(name = "inviter_account_id", nullable = false, updatable = false) val inviterAccountId: UUID,
    @Column(name = "invitee_account_id", nullable = false, updatable = false, unique = true) val inviteeAccountId: UUID,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant,
)

interface ReferralJpaRepository : JpaRepository<ReferralJpaEntity, UUID> {
    fun countByInviterAccountId(inviterAccountId: UUID): Long
    fun existsByInviteeAccountId(inviteeAccountId: UUID): Boolean
}

/** 초대 코드·초대 기록 어댑터. 유일성(코드, invitee)의 최종 판정은 DB 제약에 맡긴다. */
@Repository
class ReferralPersistenceAdapter(
    private val codes: InviteCodeJpaRepository,
    private val referrals: ReferralJpaRepository,
) : InviteCodeRepository, ReferralRepository {

    override fun findByAccountId(accountId: UUID): InviteCode? =
        codes.findById(accountId).orElse(null)?.toDomain()

    override fun findByCode(code: String): InviteCode? = codes.findByCode(code)?.toDomain()

    override fun saveIfCodeFree(inviteCode: InviteCode): Boolean =
        try {
            codes.saveAndFlush(InviteCodeJpaEntity(inviteCode.accountId, inviteCode.code, inviteCode.createdAt))
            true
        } catch (e: DataIntegrityViolationException) {
            false
        }

    override fun saveIfNew(referral: Referral): Boolean {
        if (referrals.existsByInviteeAccountId(referral.inviteeAccountId)) return false
        return try {
            referrals.saveAndFlush(ReferralJpaEntity(referral.id, referral.inviterAccountId, referral.inviteeAccountId, referral.createdAt))
            true
        } catch (e: DataIntegrityViolationException) {
            false // 같은 순간 두 번 들어온 같은 요청 — 먼저 온 쪽만 남는다
        }
    }

    override fun countByInviter(inviterAccountId: UUID): Long = referrals.countByInviterAccountId(inviterAccountId)

    override fun existsByInvitee(inviteeAccountId: UUID): Boolean = referrals.existsByInviteeAccountId(inviteeAccountId)

    private fun InviteCodeJpaEntity.toDomain() = InviteCode.reconstitute(accountId, code, createdAt)
}
