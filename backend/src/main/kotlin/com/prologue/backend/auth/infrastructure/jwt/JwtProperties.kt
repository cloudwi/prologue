package com.prologue.backend.auth.infrastructure.jwt

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/**
 * JWT 설정. application.yaml 의 `jwt.*` 에 바인딩된다.
 * - [secret]: HMAC 서명 키(HS256이라 최소 32바이트). 운영은 환경변수 JWT_SECRET로 주입.
 * - [accessTokenExpiry]/[refreshTokenExpiry]: "30m", "14d" 형식.
 */
@ConfigurationProperties(prefix = "jwt")
data class JwtProperties(
    val secret: String,
    val accessTokenExpiry: Duration,
    val refreshTokenExpiry: Duration,
)
