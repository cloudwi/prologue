package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.AccountStatus
import com.prologue.backend.auth.domain.repository.AccountRepository
import io.mockk.every
import io.mockk.mockk
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class TokenRefreshServiceTest {

    private val tokenProvider = mockk<TokenProvider>()
    private val accountRepository = mockk<AccountRepository>()
    private val service = TokenRefreshService(tokenProvider, accountRepository)

    private val accountId = AccountId(UUID.randomUUID())
    private fun account(status: AccountStatus = AccountStatus.ACTIVE): Account =
        Account.reconstitute(accountId, "user@example.com", status, emptySet(), Instant.now())

    @Test
    fun `유효한 refresh token이면 새 토큰 쌍을 발급한다`() {
        every { tokenProvider.resolveRefreshSubject("valid") } returns accountId
        every { accountRepository.findById(accountId) } returns account()
        val issued = AuthTokens("new-access", "new-refresh", 1800)
        every { tokenProvider.issue(any()) } returns issued

        assertEquals(issued, service.refresh("valid"))
    }

    @Test
    fun `서명이 틀리거나 만료된 토큰이면 거부한다`() {
        every { tokenProvider.resolveRefreshSubject("broken") } returns null

        assertFailsWith<InvalidRefreshTokenException> { service.refresh("broken") }
    }

    @Test
    fun `계정이 사라졌으면 거부한다`() {
        every { tokenProvider.resolveRefreshSubject("valid") } returns accountId
        every { accountRepository.findById(accountId) } returns null

        assertFailsWith<InvalidRefreshTokenException> { service.refresh("valid") }
    }

    @Test
    fun `정지·탈퇴 계정이면 거부한다 - 오래 사는 refresh로 제재를 우회할 수 없다`() {
        every { tokenProvider.resolveRefreshSubject("valid") } returns accountId
        every { accountRepository.findById(accountId) } returns account(AccountStatus.SUSPENDED)

        assertFailsWith<InvalidRefreshTokenException> { service.refresh("valid") }
    }
}
