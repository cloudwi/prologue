package com.prologue.backend.auth.application.port

import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.Role

/** access 토큰에서 복원한 인증 주체. 보호 API에서 "현재 로그인한 계정"을 식별한다. */
data class AuthenticatedPrincipal(
    val accountId: AccountId,
    val roles: Set<Role>,
)
