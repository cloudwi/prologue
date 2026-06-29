package com.prologue.backend.auth.application.port

/**
 * 우리 서비스가 발급한 인증 토큰 쌍.
 * 앱은 [accessToken]을 API 호출에 사용하고, 만료 시 [refreshToken]으로 재발급받는다.
 * 토큰 값은 secure-store에 보관(앱 측 책임).
 */
data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val accessTokenExpiresInSeconds: Long,
)
