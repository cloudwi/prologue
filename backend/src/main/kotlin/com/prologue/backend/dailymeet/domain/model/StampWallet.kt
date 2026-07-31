package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 우표 지갑 — 대화 신청 같은 유료 행동의 재화. 잔액은 음수가 될 수 없다.
 * 지급 경로는 지갑 첫 생성 시 환영 우표뿐이고, 충전(IAP)은 출시 직전에 붙는다.
 */
class StampWallet private constructor(
    val accountId: UUID,
    balance: Int,
    val createdAt: Instant,
    updatedAt: Instant,
) {
    var balance: Int = balance
        private set
    var updatedAt: Instant = updatedAt
        private set

    fun spend(amount: Int, now: Instant = Instant.now()) {
        if (amount <= 0) throw DailyMeetException("사용할 우표 수가 올바르지 않습니다")
        if (balance < amount) throw DailyMeetException("우표가 부족해요")
        balance -= amount
        updatedAt = now
    }

    fun grant(amount: Int, now: Instant = Instant.now()) {
        if (amount <= 0) throw DailyMeetException("지급할 우표 수가 올바르지 않습니다")
        balance += amount
        updatedAt = now
    }

    companion object {
        /** 지갑을 처음 열 때 지급되는 환영 우표. */
        const val WELCOME_STAMPS = 3

        fun open(accountId: UUID, now: Instant = Instant.now()): StampWallet =
            StampWallet(accountId, WELCOME_STAMPS, now, now)

        fun reconstitute(accountId: UUID, balance: Int, createdAt: Instant, updatedAt: Instant): StampWallet =
            StampWallet(accountId, balance, createdAt, updatedAt)
    }
}
