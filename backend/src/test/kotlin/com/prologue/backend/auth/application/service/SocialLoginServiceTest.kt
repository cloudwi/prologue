package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.port.SocialUserInfo
import com.prologue.backend.auth.application.port.SocialVerifier
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.AccountStatus
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.domain.model.Role
import com.prologue.backend.auth.domain.model.SocialConnection
import com.prologue.backend.auth.domain.model.SocialProvider
import com.prologue.backend.auth.domain.repository.AccountRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class SocialLoginServiceTest {

    private val socialVerifier = mockk<SocialVerifier>()
    private val accountRepository = mockk<AccountRepository>()
    private val tokenProvider = mockk<TokenProvider>()
    private val service = SocialLoginService(socialVerifier, accountRepository, tokenProvider)

    private val kakaoInfo = SocialUserInfo(SocialProvider.KAKAO, "kakao-123", email = "a@b.com")
    private val command = SocialLoginCommand(SocialProvider.KAKAO, "raw-token")
    private val tokens = AuthTokens("access", "refresh", 3600)

    /** DB에서 읽어온(=id 보유) 계정을 흉내내기 위한 헬퍼. */
    private fun persistedAccount(
        connection: SocialConnection,
        status: AccountStatus = AccountStatus.ACTIVE,
    ): Account = Account.reconstitute(
        id = AccountId(UUID.randomUUID()),
        connections = listOf(connection),
        status = status,
        roles = setOf(Role.USER),
        createdAt = Instant.now(),
    )

    @Test
    fun `신규 사용자는 계정을 생성하고 isNewUser true와 토큰을 받는다`() {
        val persistedId = AccountId(UUID.randomUUID())
        every { socialVerifier.verify(SocialProvider.KAKAO, "raw-token") } returns kakaoInfo
        every { accountRepository.findBySocialConnection(SocialProvider.KAKAO, "kakao-123") } returns null
        val saved = slot<Account>()
        // save 시 JPA가 id를 부여하는 것을 흉내 → id 가진 계정 반환
        every { accountRepository.save(capture(saved)) } answers {
            val a = saved.captured
            Account.reconstitute(persistedId, a.connections, a.status, a.roles, a.createdAt)
        }
        every { tokenProvider.issue(any()) } returns tokens

        val result = service.login(command)

        assertTrue(result.isNewUser)
        assertEquals(persistedId, result.accountId)
        assertEquals(tokens, result.tokens)
        assertTrue(saved.captured.hasConnection(SocialProvider.KAKAO, "kakao-123"))
        verify(exactly = 1) { accountRepository.save(any()) }
    }

    @Test
    fun `기존 사용자는 계정을 재사용하고 save를 호출하지 않는다`() {
        val existing = persistedAccount(SocialConnection(SocialProvider.KAKAO, "kakao-123"))
        every { socialVerifier.verify(SocialProvider.KAKAO, "raw-token") } returns kakaoInfo
        every { accountRepository.findBySocialConnection(SocialProvider.KAKAO, "kakao-123") } returns existing
        every { tokenProvider.issue(existing) } returns tokens

        val result = service.login(command)

        assertFalse(result.isNewUser)
        assertEquals(existing.id, result.accountId)
        verify(exactly = 0) { accountRepository.save(any()) }
    }

    @Test
    fun `정지된 계정은 로그인 차단되고 토큰을 발급하지 않는다`() {
        val existing = persistedAccount(
            SocialConnection(SocialProvider.KAKAO, "kakao-123"),
            status = AccountStatus.SUSPENDED,
        )
        every { socialVerifier.verify(SocialProvider.KAKAO, "raw-token") } returns kakaoInfo
        every { accountRepository.findBySocialConnection(SocialProvider.KAKAO, "kakao-123") } returns existing

        assertFailsWith<AuthDomainException> { service.login(command) }

        verify(exactly = 0) { tokenProvider.issue(any()) }
    }
}
