package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.ReferralService
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class IssueSpecialCodeRequest(
    @field:NotBlank(message = "코드를 입력해 주세요")
    val code: String,
    @field:Min(1, message = "초대받은 쪽 보상은 1 이상")
    val inviteeReward: Int,
    val inviterReward: Int = 0,
    /** null이면 무제한. */
    val maxUses: Int? = null,
)

data class IssueSpecialCodeResponse(val code: String, val inviteeReward: Int, val inviterReward: Int, val maxUses: Int?)

/** 운영자 — 특별 초대 코드 발급. 코드의 "초대한 사람"은 호출한 운영자 본인이다. ROLE_ADMIN. */
@RestController
@RequestMapping("/admin/referral")
class AdminReferralController(
    private val referralService: ReferralService,
) {
    @PostMapping("/codes")
    fun issue(authentication: Authentication, @Valid @RequestBody request: IssueSpecialCodeRequest): IssueSpecialCodeResponse {
        val code = referralService.issueSpecialCode(
            ownerAccountId = UUID.fromString(authentication.name),
            rawCode = request.code,
            inviteeReward = request.inviteeReward,
            inviterReward = request.inviterReward,
            maxUses = request.maxUses,
        )
        return IssueSpecialCodeResponse(code.code, code.inviteeRewardOrDefault(), code.inviterRewardOrDefault(), code.maxUses)
    }
}
