package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 잉크 지갑 — 편지·프로필 열람 같은 유료 행동의 재화. 잔액은 음수가 될 수 없다.
 *
 * 앞서 쓰던 우표를 잉크로 바꾼 이유: 우표는 "한 장 = 편지 한 통"이라 쪼갤 수 없었다.
 * 편지를 회수할 때 절반만 돌려주려 해도 0.5장은 셀 수 없고, 프로필 열기처럼
 * 편지보다 가벼운 행동에 값을 매길 자리도 없었다. 잉크는 그냥 수라서 둘 다 자연히 풀린다.
 *
 * 값표는 [InkPrice]에 모여 있다.
 */
class InkWallet private constructor(
    val accountId: UUID,
    ink: Int,
    val createdAt: Instant,
    updatedAt: Instant,
) {
    var ink: Int = ink
        private set
    var updatedAt: Instant = updatedAt
        private set

    fun spend(amount: Int, now: Instant = Instant.now()) {
        if (amount <= 0) throw DailyMeetException("사용할 잉크 양이 올바르지 않습니다")
        if (ink < amount) throw DailyMeetException("잉크가 부족해요")
        ink -= amount
        updatedAt = now
    }

    fun grant(amount: Int, now: Instant = Instant.now()) {
        if (amount <= 0) throw DailyMeetException("지급할 잉크 양이 올바르지 않습니다")
        ink += amount
        updatedAt = now
    }

    companion object {
        fun open(accountId: UUID, now: Instant = Instant.now()): InkWallet =
            InkWallet(accountId, InkPrice.WELCOME, now, now)

        fun reconstitute(accountId: UUID, ink: Int, createdAt: Instant, updatedAt: Instant): InkWallet =
            InkWallet(accountId, ink, createdAt, updatedAt)
    }
}
