package com.prologue.backend.auth.infrastructure.jwt

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.port.AuthenticatedPrincipal
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.Role
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.Instant
import java.util.Date
import javax.crypto.SecretKey

/**
 * jjwt 기반 [TokenProvider] 구현.
 * access/refresh 토큰을 HS256으로 발급하고, access 토큰에서 계정 식별자를 복원한다.
 */
@Component
class JwtTokenProvider(
    private val properties: JwtProperties,
) : TokenProvider {

    // 시크릿을 SHA-256으로 해싱 → 길이와 무관하게 항상 256비트 HS256 키 확보
    private val key: SecretKey = Keys.hmacShaKeyFor(
        MessageDigest.getInstance("SHA-256").digest(properties.secret.toByteArray(StandardCharsets.UTF_8)),
    )

    override fun issue(account: Account): AuthTokens {
        val accountId = requireNotNull(account.id) { "토큰 발급 대상 계정은 id를 가져야 한다" }
        val now = Instant.now()
        val access = buildToken(
            subject = accountId.toString(),
            type = TOKEN_TYPE_ACCESS,
            issuedAt = now,
            expiration = now.plus(properties.accessTokenExpiry),
            roles = account.roles.map { it.name },
        )
        val refresh = buildToken(
            subject = accountId.toString(),
            type = TOKEN_TYPE_REFRESH,
            issuedAt = now,
            expiration = now.plus(properties.refreshTokenExpiry),
            roles = emptyList(),
        )
        return AuthTokens(
            accessToken = access,
            refreshToken = refresh,
            accessTokenExpiresInSeconds = properties.accessTokenExpiry.seconds,
        )
    }

    override fun resolveAuthentication(accessToken: String): AuthenticatedPrincipal? = runCatching {
        val claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(accessToken)
            .payload
        if (claims["type"] != TOKEN_TYPE_ACCESS) return null
        val roles = (claims["roles"] as? List<*>)
            ?.mapNotNull { runCatching { Role.valueOf(it as String) }.getOrNull() }
            ?.toSet()
            ?: emptySet()
        AuthenticatedPrincipal(AccountId.from(claims.subject), roles)
    }.getOrElse { e ->
        if (e is JwtException || e is IllegalArgumentException) null else throw e
    }

    override fun resolveRefreshSubject(refreshToken: String): AccountId? = runCatching {
        val claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(refreshToken)
            .payload
        if (claims["type"] != TOKEN_TYPE_REFRESH) return null
        AccountId.from(claims.subject)
    }.getOrElse { e ->
        if (e is JwtException || e is IllegalArgumentException) null else throw e
    }

    private fun buildToken(
        subject: String,
        type: String,
        issuedAt: Instant,
        expiration: Instant,
        roles: List<String>,
    ): String =
        Jwts.builder()
            .subject(subject)
            .issuedAt(Date.from(issuedAt))
            .expiration(Date.from(expiration))
            .claim("type", type)
            .claim("roles", roles)
            .signWith(key)
            .compact()

    companion object {
        private const val TOKEN_TYPE_ACCESS = "access"
        private const val TOKEN_TYPE_REFRESH = "refresh"
    }
}
