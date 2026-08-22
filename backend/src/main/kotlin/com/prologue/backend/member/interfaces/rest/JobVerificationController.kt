package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.member.application.service.JobVerificationService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** 직장 인증 — 회사 이메일 코드 인증. 도메인만 저장된다. */
@RestController
@RequestMapping("/members/me/job")
class JobVerificationController(
    private val jobVerificationService: JobVerificationService,
) {
    data class JobStatusResponse(val verified: Boolean, val domain: String?)
    data class JobRequestBody(@field:NotBlank(message = "이메일을 입력해주세요") val email: String)
    data class JobVerifyBody(
        @field:NotBlank(message = "이메일을 입력해주세요") val email: String,
        @field:NotBlank(message = "인증코드를 입력해주세요") val code: String,
    )

    @GetMapping
    fun status(authentication: Authentication): JobStatusResponse {
        val domain = jobVerificationService.verifiedDomain(UUID.fromString(authentication.name))
        return JobStatusResponse(verified = domain != null, domain = domain)
    }

    @PostMapping("/request")
    fun request(authentication: Authentication, @Valid @RequestBody body: JobRequestBody) {
        jobVerificationService.requestCode(UUID.fromString(authentication.name), body.email)
    }

    @PostMapping("/verify")
    fun verify(authentication: Authentication, @Valid @RequestBody body: JobVerifyBody): JobStatusResponse {
        val domain = jobVerificationService.verify(UUID.fromString(authentication.name), body.email, body.code)
        return JobStatusResponse(verified = true, domain = domain)
    }
}
