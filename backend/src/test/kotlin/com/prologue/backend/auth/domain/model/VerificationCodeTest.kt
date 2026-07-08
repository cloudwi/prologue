package com.prologue.backend.auth.domain.model

import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class VerificationCodeTest {

    private val t0 = Instant.parse("2026-07-08T00:00:00Z")

    @Test
    fun `발급 직후 코드는 사용 가능하다`() {
        val code = VerificationCode.issue("user@example.com", "hash", t0)
        assertTrue(code.isUsable(t0))
    }

    @Test
    fun `TTL 경과 후 만료된다`() {
        val code = VerificationCode.issue("user@example.com", "hash", t0)
        val afterTtl = t0.plus(VerificationCode.TTL).plusSeconds(1)
        assertTrue(code.isExpired(afterTtl))
        assertFalse(code.isUsable(afterTtl))
    }

    @Test
    fun `소비되면 더 이상 사용 불가`() {
        val code = VerificationCode.issue("user@example.com", "hash", t0)
        code.consume(t0)
        assertTrue(code.isConsumed())
        assertFalse(code.isUsable(t0))
    }

    @Test
    fun `시도횟수를 초과하면 사용 불가`() {
        val code = VerificationCode.issue("user@example.com", "hash", t0)
        repeat(VerificationCode.MAX_ATTEMPTS) { code.recordFailedAttempt() }
        assertTrue(code.attemptsExhausted())
        assertFalse(code.isUsable(t0))
    }

    @Test
    fun `재발송 간격 이내면 issuedWithin true`() {
        val code = VerificationCode.issue("user@example.com", "hash", t0)
        val within = t0.plusSeconds(30)
        val after = t0.plus(VerificationCode.RESEND_INTERVAL).plusSeconds(1)
        assertTrue(code.issuedWithin(VerificationCode.RESEND_INTERVAL, within))
        assertFalse(code.issuedWithin(VerificationCode.RESEND_INTERVAL, after))
    }
}
