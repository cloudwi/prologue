package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.member.application.service.CompleteOnboardingCommand
import com.prologue.backend.member.application.service.OnboardingService
import com.prologue.backend.member.interfaces.rest.dto.MemberProfileResponse
import com.prologue.backend.member.interfaces.rest.dto.OnboardingRequest
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 온보딩/프로필. 인증 필요(JWT) — accountId는 토큰에서 얻는다.
 */
@RestController
@RequestMapping("/members")
class OnboardingController(
    private val onboardingService: OnboardingService,
) {
    /** 프로필 생성/수정 (upsert). */
    @PutMapping("/me")
    fun completeOnboarding(
        authentication: Authentication,
        @Valid @RequestBody request: OnboardingRequest,
    ): MemberProfileResponse {
        val accountId = UUID.fromString(authentication.name)
        val member = onboardingService.complete(
            CompleteOnboardingCommand(
                accountId = accountId,
                nickname = request.nickname,
                gender = request.gender!!,
                birthYear = request.birthYear!!,
                preferredGender = request.preferredGender!!,
                region = request.region,
            ),
        )
        return MemberProfileResponse.from(member)
    }
}
