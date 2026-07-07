package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.PasswordEncoder
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.domain.model.EmailCredential
import com.prologue.backend.auth.domain.repository.AccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 이메일 가입/로그인 유스케이스 (애플리케이션 서비스).
 *
 * 가입:  이메일 중복 확인 → 비밀번호 해싱 → 계정 등록 → JWT 발급 (isNewUser=true)
 * 로그인: 이메일로 계정 조회 → 로그인 가능 상태 확인 → 비밀번호 대조 → JWT 발급 (isNewUser=false)
 *
 * 트랜잭션 경계는 이 서비스가 소유한다. (kotlin("plugin.spring")이 @Service/@Transactional 클래스를 open 처리)
 *
 * TODO(이메일 소유 인증): 현재는 가입 즉시 ACTIVE. 추후 이메일 인증 코드/링크 발송 포트를 추가해
 *   미인증 상태(PENDING)를 거치도록 확장한다.
 */
@Service
class EmailAuthService(
    private val accountRepository: AccountRepository,
    private val passwordEncoder: PasswordEncoder,
    private val tokenProvider: TokenProvider,
) {
    @Transactional
    fun signup(command: EmailSignupCommand): LoginResult {
        val email = EmailCredential.normalizeEmail(command.email)
        if (accountRepository.findByEmail(email) != null) {
            throw EmailAlreadyRegisteredException(email)
        }

        val credential = EmailCredential(email, passwordEncoder.encode(command.password))
        val account = accountRepository.save(Account.register(credential))

        val accountId = requireNotNull(account.id) { "영속화된 계정은 반드시 id를 가진다" }
        return LoginResult(accountId = accountId, tokens = tokenProvider.issue(account), isNewUser = true)
    }

    @Transactional(readOnly = true)
    fun login(command: EmailLoginCommand): LoginResult {
        val email = EmailCredential.normalizeEmail(command.email)
        val account = accountRepository.findByEmail(email) ?: throw InvalidCredentialsException()

        if (!passwordEncoder.matches(command.password, account.credential.passwordHash)) {
            throw InvalidCredentialsException()
        }
        ensureLoginable(account)

        val accountId = requireNotNull(account.id) { "영속화된 계정은 반드시 id를 가진다" }
        return LoginResult(accountId = accountId, tokens = tokenProvider.issue(account), isNewUser = false)
    }

    private fun ensureLoginable(account: Account) {
        if (!account.isActive()) {
            throw AuthDomainException("로그인할 수 없는 계정 상태입니다 (${account.status})")
        }
    }
}
