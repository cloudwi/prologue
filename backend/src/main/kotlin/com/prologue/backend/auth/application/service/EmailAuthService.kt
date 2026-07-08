package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.CodeGenerator
import com.prologue.backend.auth.application.port.CodeHasher
import com.prologue.backend.auth.application.port.EmailSender
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.domain.model.VerificationCode
import com.prologue.backend.auth.domain.repository.AccountRepository
import com.prologue.backend.auth.domain.repository.VerificationCodeRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * 이메일 인증코드(passwordless) 인증 유스케이스.
 *
 * 발송(requestCode): 이메일 정규화 → 재발송 간격 확인 → 이전 코드 무효화 →
 *   6자리 코드 생성·해시 저장 → 이메일 발송
 * 검증(verify): 최신 코드 조회 → 만료·시도횟수 확인 → 코드 대조 →
 *   성공 시 코드 소비·정리 → 계정 find-or-create → JWT 발급
 *
 * 트랜잭션 경계는 이 서비스가 소유한다.
 */
@Service
class EmailAuthService(
    private val accountRepository: AccountRepository,
    private val verificationCodeRepository: VerificationCodeRepository,
    private val codeGenerator: CodeGenerator,
    private val codeHasher: CodeHasher,
    private val emailSender: EmailSender,
    private val tokenProvider: TokenProvider,
) {
    /** 인증코드 발송. */
    @Transactional
    fun requestCode(command: RequestCodeCommand) {
        val email = Account.normalizeEmail(command.email)
        val now = Instant.now()

        // 이메일 폭탄 방지: 직전 코드가 아직 살아있고 재발송 간격이 안 지났으면 거부
        val latest = verificationCodeRepository.findLatestActiveByEmail(email)
        if (latest != null && !latest.isExpired(now) &&
            latest.issuedWithin(VerificationCode.RESEND_INTERVAL, now)
        ) {
            throw TooManyRequestsException("인증코드를 방금 보냈어요. 잠시 후 다시 시도해 주세요.")
        }

        // 이전 코드 전부 무효화(1개 이메일당 유효 코드 1개 유지)
        verificationCodeRepository.deleteByEmail(email)

        val rawCode = codeGenerator.generate()
        val code = VerificationCode.issue(email, codeHasher.hash(rawCode), now)
        verificationCodeRepository.save(code)

        emailSender.sendVerificationCode(email, rawCode)
    }

    /** 인증코드 검증 → 로그인/가입 처리. */
    @Transactional
    fun verify(command: VerifyCodeCommand): LoginResult {
        val email = Account.normalizeEmail(command.email)
        val now = Instant.now()

        val code = verificationCodeRepository.findLatestActiveByEmail(email)
            ?: throw InvalidVerificationCodeException()

        if (code.isExpired(now)) throw InvalidVerificationCodeException()
        if (code.attemptsExhausted()) {
            throw TooManyRequestsException("시도 횟수를 초과했어요. 코드를 다시 요청해 주세요.")
        }

        if (!codeHasher.matches(command.code, code.codeHash)) {
            code.recordFailedAttempt()
            verificationCodeRepository.save(code)
            throw InvalidVerificationCodeException()
        }

        // 성공: 코드 소비 + 해당 이메일 코드 전부 정리
        code.consume(now)
        verificationCodeRepository.save(code)
        verificationCodeRepository.deleteByEmail(email)

        // 계정 find-or-create
        val existing = accountRepository.findByEmail(email)
        val isNewUser = existing == null
        val account = existing?.also { ensureLoginable(it) }
            ?: accountRepository.save(Account.register(email, now))

        val accountId = requireNotNull(account.id) { "영속화된 계정은 반드시 id를 가진다" }
        return LoginResult(accountId = accountId, tokens = tokenProvider.issue(account), isNewUser = isNewUser)
    }

    private fun ensureLoginable(account: Account) {
        if (!account.isActive()) {
            throw AuthDomainException("로그인할 수 없는 계정 상태입니다 (${account.status})")
        }
    }
}
