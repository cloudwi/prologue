package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.InviteCode
import com.prologue.backend.dailymeet.domain.model.Referral
import java.util.UUID

interface InviteCodeRepository {
    fun findByAccountId(accountId: UUID): InviteCode?
    fun findByCode(code: String): InviteCode?

    /** 저장. 코드가 이미 있으면(충돌) false — 호출 쪽이 새 코드로 다시 시도한다. */
    fun saveIfCodeFree(inviteCode: InviteCode): Boolean
}

interface ReferralRepository {
    /** 저장. 이 invitee가 이미 초대를 쓴 적 있으면 false. */
    fun saveIfNew(referral: Referral): Boolean
    fun countByInviter(inviterAccountId: UUID): Long
    fun existsByInvitee(inviteeAccountId: UUID): Boolean
}
