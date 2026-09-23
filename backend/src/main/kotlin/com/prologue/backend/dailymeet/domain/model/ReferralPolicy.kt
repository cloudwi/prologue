package com.prologue.backend.dailymeet.domain.model

import java.time.Duration
import java.time.Instant

/**
 * 초대 보상이 지급되는 조건 — 무엇이 "초대"로 인정되고, 얼마를 주는가.
 *
 * 초대받은 사람이 여성이면 개인 코드 보상을 [FEMALE_INVITEE_MULTIPLIER]배로 올린다(양쪽 모두).
 * 소개팅 앱은 성비가 생사를 가른다 — 여성 회원이 모자라면 남성 회원도 곧 떠난다. 그리고 초기에
 * 여성 회원을 데려오는 가장 값싼 길은 광고가 아니라 이미 들어온 회원의 친구다. 그래서 "누구를"
 * 데려왔는지에 값을 매긴다. 운영자의 특별 코드는 코드에 적힌 보상을 그대로 쓰고 배수를 타지 않는다.
 *
 * 성별은 [Member][com.prologue.backend.member.domain.model.Member]의 것이지만 여기서는 Boolean으로만 받는다 —
 * 보상 정책이 회원 컨텍스트의 enum에 묶이지 않게.
 */
object ReferralPolicy {
    /** 초대한 쪽이 보상을 받는 상한. 그 뒤로도 초대는 되고 초대받은 쪽은 받는다 — 찍어내기만 막는다. */
    const val MAX_REWARDED_INVITES = 10

    /** 초대받은 사람이 여성일 때 기본 보상에 곱하는 배수. 초대한 쪽·초대받은 쪽 모두에게 같이 적용된다. */
    const val FEMALE_INVITEE_MULTIPLIER = 2

    /** 가입하고 이 기간 안에만 코드를 쓸 수 있다 — 초대는 "데려오는" 일이지 옛 회원이 코드를 줍는 일이 아니다. */
    val REDEEM_WINDOW: Duration = Duration.ofDays(7)

    fun canRedeem(accountCreatedAt: Instant, now: Instant = Instant.now()): Boolean =
        !accountCreatedAt.plus(REDEEM_WINDOW).isBefore(now)

    fun inviterRewarded(rewardedSoFar: Long): Boolean = rewardedSoFar < MAX_REWARDED_INVITES

    /** 개인 코드의 실제 지급액 — [base]에 초대받은 사람이 여성이면 배수를 곱한다. */
    fun rewardFor(base: Int, inviteeIsFemale: Boolean): Int =
        if (inviteeIsFemale) base * FEMALE_INVITEE_MULTIPLIER else base
}
