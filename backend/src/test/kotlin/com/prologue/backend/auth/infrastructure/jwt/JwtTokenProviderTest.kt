package com.prologue.backend.auth.infrastructure.jwt

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.AccountStatus
import com.prologue.backend.auth.domain.model.Role
import com.prologue.backend.auth.domain.model.SocialConnection
import com.prologue.backend.auth.domain.model.SocialProvider
import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class JwtTokenProviderTest {

    private val properties = JwtProperties(
        secret = "test-secret-test-secret-test-secret-1234", // 40바이트 (HS256 최소 32)
        accessTokenExpiry = Duration.ofMinutes(30),
        refreshTokenExpiry = Duration.ofDays(14),
    )
    private val provider = JwtTokenProvider(properties)

    private val account = Account.reconstitute(
        id = AccountId(UUID.randomUUID()),
        connections = listOf(SocialConnection(SocialProvider.KAKAO, "kakao-123")),
        status = AccountStatus.ACTIVE,
        roles = setOf(Role.USER),
        createdAt = Instant.now(),
    )

    @Test
    fun `access 토큰을 발급하고 다시 계정 식별자로 복원한다`() {
        val tokens = provider.issue(account)

        assertTrue(tokens.accessToken.isNotBlank())
        assertTrue(tokens.refreshToken.isNotBlank())
        assertEquals(1800, tokens.accessTokenExpiresInSeconds)
        assertEquals(account.id, provider.resolveAccountId(tokens.accessToken))
    }

    @Test
    fun `잘못된 토큰은 null을 반환한다`() {
        assertNull(provider.resolveAccountId("not-a-jwt"))
    }

    @Test
    fun `refresh 토큰은 access로 인정되지 않는다`() {
        val tokens = provider.issue(account)

        assertNull(provider.resolveAccountId(tokens.refreshToken))
    }
}
