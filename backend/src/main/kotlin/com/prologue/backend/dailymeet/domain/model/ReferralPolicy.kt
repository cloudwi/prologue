package com.prologue.backend.dailymeet.domain.model

import java.time.Duration
import java.time.Instant

/** 초대 보상이 지급되는 조건 — 무엇이 "초대"로 인정되는가. */
object ReferralPolicy {
    /** 초대한 쪽이 보상을 받는 상한. 그 뒤로도 초대는 되고 초대받은 쪽은 받는다 — 찍어내기만 막는다. */
    const val MAX_REWARDED_INVITES = 10

    /** 가입하고 이 기간 안에만 코드를 쓸 수 있다 — 초대는 "데려오는" 일이지 옛 회원이 코드를 줍는 일이 아니다. */
    val REDEEM_WINDOW: Duration = Duration.ofDays(7)

    fun canRedeem(accountCreatedAt: Instant, now: Instant = Instant.now()): Boolean =
        !accountCreatedAt.plus(REDEEM_WINDOW).isBefore(now)

    fun inviterRewarded(rewardedSoFar: Long): Boolean = rewardedSoFar < MAX_REWARDED_INVITES
}
