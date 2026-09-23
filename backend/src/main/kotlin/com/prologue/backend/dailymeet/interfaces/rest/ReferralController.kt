package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.InkService
import com.prologue.backend.dailymeet.application.service.ReferralService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class ReferralResponse(
    val code: String,
    val invitedCount: Int,
    val rewardInk: Int,
    val maxRewardedInvites: Int,
    val shareUrl: String,
    val redeemed: Boolean,
    /** 초대받은 친구가 여성이면 둘이 각자 받는 잉크. 가산적 필드 — 구 앱은 무시한다. */
    val femaleBonusInk: Int,
)

data class RedeemReferralRequest(
    @field:NotBlank(message = "초대 코드를 입력해 주세요")
    val code: String,
)

data class RedeemReferralResponse(val inkGranted: Int, val balance: Int)

/** 친구 초대 — 내 코드 보기, 친구 코드 쓰기. 인증 필요(JWT). */
@RestController
@RequestMapping("/referral")
class ReferralController(
    private val referralService: ReferralService,
    private val inkService: InkService,
) {
    @GetMapping
    fun mine(authentication: Authentication): ReferralResponse {
        val v = referralService.mine(UUID.fromString(authentication.name))
        return ReferralResponse(v.code, v.invitedCount, v.rewardInk, v.maxRewardedInvites, v.shareUrl, v.redeemed, v.femaleBonusInk)
    }

    @PostMapping("/redeem")
    fun redeem(authentication: Authentication, @Valid @RequestBody request: RedeemReferralRequest): RedeemReferralResponse {
        val accountId = UUID.fromString(authentication.name)
        val granted = referralService.redeem(accountId, request.code)
        return RedeemReferralResponse(granted, inkService.balance(accountId))
    }
}
