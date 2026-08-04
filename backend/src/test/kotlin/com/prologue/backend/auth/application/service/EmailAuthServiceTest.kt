package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.port.CodeGenerator
import com.prologue.backend.auth.application.port.CodeHasher
import com.prologue.backend.auth.application.port.EmailSender
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.AccountStatus
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.domain.model.Role
import com.prologue.backend.auth.domain.model.VerificationCode
import com.prologue.backend.auth.domain.repository.AccountRepository
import com.prologue.backend.auth.domain.repository.VerificationCodeRepository
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
    private val codeRepository = mockk<VerificationCodeRepository>(relaxUnitFun = true)
    private val codeGenerator = mockk<CodeGenerator>()
    private val codeHasher = mockk<CodeHasher>()
    private val emailSender = mockk<EmailSender>(relaxUnitFun = true)
    private val tokenProvider = mockk<TokenProvider>()
    private val service = EmailAuthService(
        accountRepository, codeRepository, codeGenerator, codeHasher, emailSender, tokenProvider,
    )

    private val tokens = AuthTokens("access", "refresh", 3600)

    private fun persistedAccount(
        email: String = "user@example.com",
        status: AccountStatus = AccountStatus.ACTIVE,
    ): Account = Account.reconstitute(
        id = AccountId(UUID.randomUUID()),
        email = email,
        status = status,
        roles = setOf(Role.USER),
        createdAt = Instant.now(),
    )

    private fun activeCode(email: String = "user@example.com", codeHash: String = "hashed"): VerificationCode =
        VerificationCode.issue(email, codeHash, Instant.now())

    // --- requestCode ---

    @Test
    fun `requestCode는 이메일 정규화 후 코드를 생성·저장·발송한다`() {
        every { codeRepository.findLatestActiveByEmail("user@example.com") } returns null
        every { codeGenerator.generate() } returns "042917"
        every { codeHasher.hash("042917") } returns "hashed"
        val saved = slot<VerificationCode>()
        every { codeRepository.save(capture(saved)) } answers { saved.captured }

        service.requestCode(RequestCodeCommand("  User@Example.COM "))

        assertEquals("user@example.com", saved.captured.email)
        assertEquals("hashed", saved.captured.codeHash)
        verify { codeRepository.deleteByEmail("user@example.com") } // 이전 코드 무효화
        verify { emailSender.sendVerificationCode("user@example.com", "042917") }
    }

    @Test
    fun `requestCode는 재발송 간격 이내면 TooManyRequests`() {
        every { codeRepository.findLatestActiveByEmail("user@example.com") } returns activeCode()

        assertFailsWith<TooManyRequestsException> {
            service.requestCode(RequestCodeCommand("user@example.com"))
        }
        verify(exactly = 0) { emailSender.sendVerificationCode(any(), any()) }
    }

    // --- verify ---

    @Test
    fun `기존 계정 검증 성공 시 토큰과 isNewUser false`() {
        val account = persistedAccount()
        every { codeRepository.findLatestActiveByEmail("user@example.com") } returns activeCode()
        every { codeHasher.matches("042917", "hashed") } returns true
        every { accountRepository.findByEmail("user@example.com") } returns account
        every { codeRepository.save(any()) } answers { firstArg() }
        every { tokenProvider.issue(account) } returns tokens

        val result = service.verify(VerifyCodeCommand("User@Example.com", "042917"))

        assertFalse(result.isNewUser)
        assertEquals(account.id, result.accountId)
        verify { codeRepository.deleteByEmail("user@example.com") } // 성공 후 정리
    }

    @Test
    fun `신규 이메일 검증 성공 시 계정 생성하고 isNewUser true`() {
        val persistedId = AccountId(UUID.randomUUID())
        every { codeRepository.findLatestActiveByEmail("new@example.com") } returns activeCode("new@example.com")
        every { codeHasher.matches("042917", "hashed") } returns true
        every { accountRepository.findByEmail("new@example.com") } returns null
        val savedAcc = slot<Account>()
        every { accountRepository.save(capture(savedAcc)) } answers {
            Account.reconstitute(persistedId, savedAcc.captured.email, savedAcc.captured.status, savedAcc.captured.roles, savedAcc.captured.createdAt)
        }
        every { codeRepository.save(any()) } answers { firstArg() }
        every { tokenProvider.issue(any()) } returns tokens

        val result = service.verify(VerifyCodeCommand("new@example.com", "042917"))

        assertTrue(result.isNewUser)
        assertEquals("new@example.com", savedAcc.captured.email)
        assertEquals(persistedId, result.accountId)
    }

    @Test
    fun `코드가 없으면 InvalidVerificationCode`() {
        every { codeRepository.findLatestActiveByEmail("user@example.com") } returns null

        assertFailsWith<InvalidVerificationCodeException> {
            service.verify(VerifyCodeCommand("user@example.com", "042917"))
        }
        verify(exactly = 0) { tokenProvider.issue(any()) }
    }

    @Test
    fun `코드 불일치 시 시도횟수 증가 후 InvalidVerificationCode`() {
        val code = activeCode()
        every { codeRepository.findLatestActiveByEmail("user@example.com") } returns code
        every { codeHasher.matches("000000", "hashed") } returns false
        every { codeRepository.save(any()) } answers { firstArg() }

        assertFailsWith<InvalidVerificationCodeException> {
            service.verify(VerifyCodeCommand("user@example.com", "000000"))
        }
        assertEquals(1, code.attempts)
        verify { codeRepository.save(code) }
        verify(exactly = 0) { tokenProvider.issue(any()) }
    }

    @Test
    fun `정지된 계정은 코드가 맞아도 로그인 차단`() {
        every { codeRepository.findLatestActiveByEmail("user@example.com") } returns activeCode()
        every { codeHasher.matches("042917", "hashed") } returns true
        every { accountRepository.findByEmail("user@example.com") } returns persistedAccount(status = AccountStatus.SUSPENDED)
        every { codeRepository.save(any()) } answers { firstArg() }

        assertFailsWith<AuthDomainException> {
            service.verify(VerifyCodeCommand("user@example.com", "042917"))
        }
        verify(exactly = 0) { tokenProvider.issue(any()) }
    }

    // --- 심사용 데모 계정 ---

    private val reviewService = EmailAuthService(
        accountRepository, codeRepository, codeGenerator, codeHasher, emailSender, tokenProvider,
        reviewEmail = "review@prologue.day",
        reviewCode = "741930",
    )

    @Test
    fun `심사용 이메일은 requestCode에서 코드 저장·발송을 건너뛴다`() {
        reviewService.requestCode(RequestCodeCommand("review@prologue.day"))

        verify(exactly = 0) { codeRepository.save(any()) }
        verify(exactly = 0) { emailSender.sendVerificationCode(any(), any()) }
    }

    @Test
    fun `심사용 이메일은 저장된 코드 없이 고정 코드로 로그인된다`() {
        val account = persistedAccount(email = "review@prologue.day")
        every { accountRepository.findByEmail("review@prologue.day") } returns account
        every { tokenProvider.issue(account) } returns tokens

        val result = reviewService.verify(VerifyCodeCommand("review@prologue.day", "741930"))

        assertEquals(account.id, result.accountId)
        assertFalse(result.isNewUser)
        verify(exactly = 0) { codeRepository.findLatestActiveByEmail(any()) }
    }

    @Test
    fun `심사용 이메일도 코드가 틀리면 InvalidVerificationCode`() {
        assertFailsWith<InvalidVerificationCodeException> {
            reviewService.verify(VerifyCodeCommand("review@prologue.day", "000000"))
        }
        verify(exactly = 0) { tokenProvider.issue(any()) }
    }

    @Test
    fun `일반 이메일은 review 설정이 있어도 기존 검증 경로를 탄다`() {
        every { codeRepository.findLatestActiveByEmail("user@example.com") } returns null

        assertFailsWith<InvalidVerificationCodeException> {
            reviewService.verify(VerifyCodeCommand("user@example.com", "741930"))
        }
    }
}
