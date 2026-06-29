package com.prologue.backend.auth.interfaces.rest.dto

import com.prologue.backend.auth.application.service.LoginResult

/**
 * 소셜 로그인 응답. [isNewUser]로 앱이 온보딩/홈 분기.
 */
data class LoginResponse(
    val accountId: String,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long,
    val isNewUser: Boolean,
) {
    companion object {
        fun from(result: LoginResult): LoginResponse =
            LoginResponse(
                accountId = result.accountId.toString(),
                accessToken = result.tokens.accessToken,
                refreshToken = result.tokens.refreshToken,
                expiresIn = result.tokens.accessTokenExpiresInSeconds,
                isNewUser = result.isNewUser,
            )
    }
}
