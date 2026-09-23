package com.prologue.backend.dailymeet.domain.model

import java.time.Duration
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ReferralPolicyTest {

    @Test
    fun `보상 - 초대받은 사람이 여성이면 배수를, 아니면 기본값을 준다`() {
        assertEquals(100 * ReferralPolicy.FEMALE_INVITEE_MULTIPLIER, ReferralPolicy.rewardFor(100, inviteeIsFemale = true))
        assertEquals(100, ReferralPolicy.rewardFor(100, inviteeIsFemale = false))
        // 0(특별 코드의 초대한 쪽처럼)은 곱해도 0 — 배수가 없던 보상을 만들어내지 않는다
        assertEquals(0, ReferralPolicy.rewardFor(0, inviteeIsFemale = true))
    }

    @Test
    fun `배수는 1보다 크다 - 1이면 "여성 보너스"라는 말이 거짓이 된다`() {
        assertTrue(ReferralPolicy.FEMALE_INVITEE_MULTIPLIER > 1)
    }

    @Test
    fun `초대한 쪽 상한 - 이전까지 데려온 수가 상한 미만일 때만 받는다`() {
        assertTrue(ReferralPolicy.inviterRewarded(0))
        assertTrue(ReferralPolicy.inviterRewarded((ReferralPolicy.MAX_REWARDED_INVITES - 1).toLong()))
        assertFalse(ReferralPolicy.inviterRewarded(ReferralPolicy.MAX_REWARDED_INVITES.toLong()))
    }

    @Test
    fun `가입 기한 - 기한 안이면 되고, 하루라도 지나면 안 된다`() {
        val joined = Instant.parse("2026-09-01T00:00:00Z")
        assertTrue(ReferralPolicy.canRedeem(joined, joined.plus(ReferralPolicy.REDEEM_WINDOW)))
        assertFalse(ReferralPolicy.canRedeem(joined, joined.plus(ReferralPolicy.REDEEM_WINDOW).plus(Duration.ofSeconds(1))))
    }
}
