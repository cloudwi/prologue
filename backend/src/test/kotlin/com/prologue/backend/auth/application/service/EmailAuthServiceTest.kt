package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.port.PasswordEncoder
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.AccountStatus
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.domain.model.EmailCredential
import com.prologue.backend.auth.domain.model.Role
import com.prologue.backend.auth.domain.repository.AccountRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class EmailAuthServiceTest {

    private val accountRepository = mockk<AccountRepository>()
    private val passwordEncoder = mockk<PasswordEncoder>()
    private val tokenProvider = mockk<TokenProvider>()
    private val service = EmailAuthService(accountRepository, passwordEncoder, tokenProvider)

    private val tokens = AuthTokens("access", "refresh", 3600)

    private fun persistedAccount(
        email: String = "user@example.com",
        passwordHash: String = "hashed-pw",
        status: AccountStatus = AccountStatus.ACTIVE,
    ): Account = Account.reconstitute(
        id = AccountId(UUID.randomUUID()),
        credential = EmailCredential(email, passwordHash),
        status = status,
        roles = setOf(Role.USER),
        createdAt = Instant.now(),
    )

    // --- 가입 ---

    @Test
    fun `가입은 이메일을 정규화하고 비밀번호를 해싱해 계정을 생성한다`() {
        val persistedId = AccountId(UUID.randomUUID())
        every { accountRepository.findByEmail("user@example.com") } returns null
        every { passwordEncoder.encode("plain-pw") } returns "hashed-pw"
        val saved = slot<Account>()
        every { accountRepository.save(capture(saved)) } answers {
            val a = saved.captured
            Account.reconstitute(persistedId, a.credential, a.status, a.roles, a.createdAt)
        }
        every { tokenProvider.issue(any()) } returns tokens

        val result = service.signup(EmailSignupCommand("  User@Example.COM ", "plain-pw"))

        assertTrue(result.isNewUser)
        assertEquals(persistedId, result.accountId)
        assertEquals(tokens, result.tokens)
        assertEquals("user@example.com", saved.captured.credential.email)
        assertEquals("hashed-pw", saved.captured.credential.passwordHash)
    }

    @Test
    fun `이미 가입된 이메일이면 예외를 던지고 저장하지 않는다`() {
        every { accountRepository.findByEmail("user@example.com") } returns persistedAccount()

        assertFailsWith<EmailAlreadyRegisteredException> {
            service.signup(EmailSignupCommand("user@example.com", "plain-pw"))
        }
        verify(exactly = 0) { accountRepository.save(any()) }
    }

    // --- 로그인 ---

    @Test
    fun `로그인 성공 시 토큰과 isNewUser false를 반환한다`() {
        val account = persistedAccount()
        every { accountRepository.findByEmail("user@example.com") } returns account
        every { passwordEncoder.matches("plain-pw", "hashed-pw") } returns true
        every { tokenProvider.issue(account) } returns tokens

        val result = service.login(EmailLoginCommand("User@Example.com", "plain-pw"))

        assertFalse(result.isNewUser)
        assertEquals(account.id, result.accountId)
        assertEquals(tokens, result.tokens)
    }

    @Test
    fun `존재하지 않는 이메일은 InvalidCredentials를 던진다`() {
        every { accountRepository.findByEmail("user@example.com") } returns null

        assertFailsWith<InvalidCredentialsException> {
            service.login(EmailLoginCommand("user@example.com", "plain-pw"))
        }
        verify(exactly = 0) { tokenProvider.issue(any()) }
    }

    @Test
    fun `비밀번호 불일치는 InvalidCredentials를 던진다`() {
        every { accountRepository.findByEmail("user@example.com") } returns persistedAccount()
        every { passwordEncoder.matches("wrong-pw", "hashed-pw") } returns false

        assertFailsWith<InvalidCredentialsException> {
            service.login(EmailLoginCommand("user@example.com", "wrong-pw"))
        }
        verify(exactly = 0) { tokenProvider.issue(any()) }
    }

    @Test
    fun `정지된 계정은 로그인 차단되고 토큰을 발급하지 않는다`() {
        every { accountRepository.findByEmail("user@example.com") } returns
            persistedAccount(status = AccountStatus.SUSPENDED)
        every { passwordEncoder.matches("plain-pw", "hashed-pw") } returns true

        assertFailsWith<AuthDomainException> {
            service.login(EmailLoginCommand("user@example.com", "plain-pw"))
        }
        verify(exactly = 0) { tokenProvider.issue(any()) }
    }
}
