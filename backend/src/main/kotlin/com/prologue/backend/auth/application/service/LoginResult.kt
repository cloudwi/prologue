package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.domain.model.AccountId

/**
 * 인증(가입/로그인) 결과.
 * [isNewUser]가 true면 앱은 온보딩(프로필 작성)으로, false면 홈으로 분기한다.
 */
data class LoginResult(
    val accountId: AccountId,
    val tokens: AuthTokens,
    val isNewUser: Boolean,
)
