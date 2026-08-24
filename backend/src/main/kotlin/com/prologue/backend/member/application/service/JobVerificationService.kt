package com.prologue.backend.member.application.service

import com.prologue.backend.auth.application.port.CodeGenerator
import com.prologue.backend.auth.application.port.CodeHasher
import com.prologue.backend.auth.application.port.EmailSender
import com.prologue.backend.auth.application.service.InvalidVerificationCodeException
import com.prologue.backend.auth.application.service.TooManyRequestsException
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.VerificationCode
import com.prologue.backend.auth.domain.repository.VerificationCodeRepository
import com.prologue.backend.member.domain.model.MemberDomainException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 직장 인증 — 회사 이메일로 코드를 받아 확인한다.
 *
 * 서류 검수 대신 자동 인증: 회사 메일함에 접근할 수 있다는 것이 곧 재직의 증거다.
 * 성공하면 **도메인**과 이메일의 **HMAC 해시**만 남긴다(원문은 저장하지 않는다).
 * 해시는 재사용 방지용이다 — 한 이메일로는 한 계정만 인증할 수 있다(메일 빌려주기 차단).
 * 코드 발급·검증은 로그인 인증의 저장소·해셔를 그대로 빌려 쓴다(회사 이메일은 로그인
 * 이메일과 달라 코드가 섞이지 않고, 여기의 verify는 로그인을 만들지 않는다).
 */
@Service
class JobVerificationService(
    private val verificationCodeRepository: VerificationCodeRepository,
    private val codeGenerator: CodeGenerator,
    private val codeHasher: CodeHasher,
    private val emailSender: EmailSender,
    private val jdbc: JdbcTemplate,
    private val privacyHasher: PrivacyHasher,
) {
    /** 인증된 도메인. 미인증이면 null. */
    @Transactional(readOnly = true)
    fun verifiedDomain(accountId: UUID): String? =
        jdbc.query("select email_domain from job_verifications where account_id = ?", { rs, _ -> rs.getString(1) }, accountId)
            .firstOrNull()

    @Transactional
    fun requestCode(accountId: UUID, rawEmail: String) {
        val email = Account.normalizeEmail(rawEmail)
        val domain = domainOf(email)
        if (domain in FREE_EMAIL_DOMAINS) {
            throw MemberDomainException("개인 메일(${domain})은 직장 인증에 쓸 수 없어요. 회사 이메일을 입력해주세요.")
        }
        // 한 이메일 = 한 계정. 코드를 보내기 전에 거절해야 쓸모없는 코드가 메일함에 쌓이지 않는다.
        requireEmailNotTaken(accountId, email)
        val now = Instant.now()
        val latest = verificationCodeRepository.findLatestActiveByEmail(email)
        if (latest != null && !latest.isExpired(now) && latest.issuedWithin(VerificationCode.RESEND_INTERVAL, now)) {
            throw TooManyRequestsException("인증코드를 방금 보냈어요. 잠시 후 다시 시도해 주세요.")
        }
        verificationCodeRepository.deleteByEmail(email)
        val rawCode = codeGenerator.generate()
        verificationCodeRepository.save(VerificationCode.issue(email, codeHasher.hash(rawCode), now))
        emailSender.sendVerificationCode(email, rawCode)
    }

    @Transactional
    fun verify(accountId: UUID, rawEmail: String, rawCode: String): String {
        val email = Account.normalizeEmail(rawEmail)
        val now = Instant.now()
        val code = verificationCodeRepository.findLatestActiveByEmail(email) ?: throw InvalidVerificationCodeException()
        if (code.isExpired(now)) throw InvalidVerificationCodeException()
        if (code.attemptsExhausted()) throw TooManyRequestsException("시도 횟수를 초과했어요. 코드를 다시 요청해 주세요.")
        if (!codeHasher.matches(rawCode, code.codeHash)) {
            code.recordFailedAttempt()
            verificationCodeRepository.save(code)
            throw InvalidVerificationCodeException()
        }
        code.consume(now)
        verificationCodeRepository.save(code)
        verificationCodeRepository.deleteByEmail(email)

        // 코드 요청과 검증 사이에 다른 계정이 먼저 인증했을 수 있다 — 여기서도 막는다.
        // 최후의 보루는 email_hash unique 인덱스(V48)다.
        requireEmailNotTaken(accountId, email)
        val domain = domainOf(email)
        jdbc.update(
            """
            insert into job_verifications (account_id, email_domain, email_hash, verified_at) values (?, ?, ?, now())
            on conflict (account_id) do update set email_domain = excluded.email_domain, email_hash = excluded.email_hash, verified_at = now()
            """.trimIndent(),
            accountId, domain, privacyHasher.hash(email),
        )
        return domain
    }

    /**
     * 한 이메일 = 한 계정 — 회사 메일을 빌려 여러 계정이 배지를 다는 것을 막는다.
     * 이메일 원문은 저장하지 않고 HMAC 해시로만 대조한다. 본인이 같은 메일로 재인증하는 건 허용.
     */
    private fun requireEmailNotTaken(accountId: UUID, email: String) {
        val takenBy = jdbc.query(
            "select account_id from job_verifications where email_hash = ?",
            { rs, _ -> UUID.fromString(rs.getString(1)) },
            privacyHasher.hash(email),
        ).firstOrNull()
        if (takenBy != null && takenBy != accountId) {
            throw MemberDomainException("이미 다른 계정에서 인증에 사용된 이메일이에요")
        }
    }

    private fun domainOf(email: String): String {
        val domain = email.substringAfterLast('@', "")
        if (domain.isBlank() || !domain.contains('.')) throw MemberDomainException("이메일 형식을 확인해 주세요")
        return domain
    }

    companion object {
        /** 무료 메일 도메인 — 직장의 증거가 되지 못한다. */
        val FREE_EMAIL_DOMAINS = setOf(
            "gmail.com", "naver.com", "daum.net", "hanmail.net", "kakao.com", "nate.com",
            "outlook.com", "hotmail.com", "yahoo.com", "yahoo.co.kr", "icloud.com", "me.com",
            "proton.me", "protonmail.com", "aol.com", "live.com", "msn.com",
        )
    }
}
