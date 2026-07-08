package com.prologue.backend.auth.domain.model

import java.time.Duration
import java.time.Instant
import java.util.UUID

/**
 * 이메일 인증코드(OTP). 이메일로 발송된 6자리 코드 한 건의 수명과 상태를 담는 엔티티.
 *
 * 수명주기: 발급([issue]) → 이메일 발송 → 검증 시도 → 성공하면 소비([consume]),
 * 실패하면 시도횟수 누적([recordFailedAttempt]). [expiresAt] 이후 또는 시도횟수 초과 시 무효.
 *
 * 보안: 코드 원문은 저장하지 않는다 — [codeHash](해시된 값)만 보관한다.
 */
class VerificationCode private constructor(
    val id: UUID?,
    val email: String,
    val codeHash: String,
    val expiresAt: Instant,
    attempts: Int,
    consumedAt: Instant?,
    val createdAt: Instant,
) {
    var attempts: Int = attempts
        private set

    var consumedAt: Instant? = consumedAt
        private set

    fun isConsumed(): Boolean = consumedAt != null

    fun isExpired(now: Instant): Boolean = !now.isBefore(expiresAt)

    /** 시도횟수 소진 여부(무차별 대입 방지). */
    fun attemptsExhausted(): Boolean = attempts >= MAX_ATTEMPTS

    /** 검증에 쓸 수 있는 상태인가(미소비 · 미만료 · 시도 여유). */
    fun isUsable(now: Instant): Boolean = !isConsumed() && !isExpired(now) && !attemptsExhausted()

    /** 재발급 억제용: 발급 후 경과 시간이 [interval] 미만이면 true. */
    fun issuedWithin(interval: Duration, now: Instant): Boolean =
        now.isBefore(createdAt.plus(interval))

    fun recordFailedAttempt() {
        attempts += 1
    }

    fun consume(now: Instant) {
        consumedAt = now
    }

    companion object {
        /** 코드당 최대 검증 시도 횟수. */
        const val MAX_ATTEMPTS = 5

        /** 코드 유효시간. */
        val TTL: Duration = Duration.ofMinutes(5)

        /** 재발급 최소 간격(이메일 폭탄 방지). */
        val RESEND_INTERVAL: Duration = Duration.ofSeconds(60)

        /**
         * 새 인증코드 발급.
         * @param codeHash 해싱된 코드(원문 아님)
         */
        fun issue(email: String, codeHash: String, now: Instant = Instant.now()): VerificationCode =
            VerificationCode(
                id = null,
                email = email,
                codeHash = codeHash,
                expiresAt = now.plus(TTL),
                attempts = 0,
                consumedAt = null,
                createdAt = now,
            )

        fun reconstitute(
            id: UUID,
            email: String,
            codeHash: String,
            expiresAt: Instant,
            attempts: Int,
            consumedAt: Instant?,
            createdAt: Instant,
        ): VerificationCode = VerificationCode(id, email, codeHash, expiresAt, attempts, consumedAt, createdAt)
    }
}
