package com.prologue.backend.member.domain.repository

import com.prologue.backend.member.domain.model.MemberConsent
import java.util.UUID

/** 동의 기록 영속성 포트. 쌓기만 하고 고치지 않는다. */
interface MemberConsentRepository {
    fun save(consent: MemberConsent): MemberConsent

    /** 해당 계정에 남은 동의 기록이 있는지. 가입 시 한 번만 남기기 위한 확인. */
    fun existsByAccountId(accountId: UUID): Boolean

    /** 민감정보(선호 성별)에 동의한 기록이 이미 있는지. 소개팅을 켤 때 한 번만 더 쌓기 위한 확인. */
    fun sensitiveAgreedByAccountId(accountId: UUID): Boolean

    /** 신념(종교·정치 성향) 수집에 동의한 기록이 이미 있는지. 두 번째부터는 다시 묻지 않는다. */
    fun beliefsAgreedByAccountId(accountId: UUID): Boolean
}
