package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.service.EmailAuthService
import com.prologue.backend.auth.application.service.RequestCodeCommand
import com.prologue.backend.auth.application.service.VerifyCodeCommand
import com.prologue.backend.auth.domain.model.VerificationCode
import com.prologue.backend.auth.interfaces.rest.dto.LoginResponse
import com.prologue.backend.auth.interfaces.rest.dto.RequestCodeRequest
import com.prologue.backend.auth.interfaces.rest.dto.RequestCodeResponse
import com.prologue.backend.auth.interfaces.rest.dto.VerifyCodeRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 이메일 인증코드(passwordless) 인증 엔드포인트.
 * 앱은 이메일로 코드를 요청하고, 받은 6자리 코드를 검증해 우리 JWT를 발급받는다.
 */
@RestController
@RequestMapping("/auth/email")
class AuthController(
    private val emailAuthService: EmailAuthService,
) {
    @PostMapping("/request-code")
    fun requestCode(@Valid @RequestBody request: RequestCodeRequest): RequestCodeResponse {
        emailAuthService.requestCode(RequestCodeCommand(request.email))
        return RequestCodeResponse(expiresInSeconds = VerificationCode.TTL.seconds)
    }

    @PostMapping("/verify")
    fun verify(@Valid @RequestBody request: VerifyCodeRequest): LoginResponse {
        val result = emailAuthService.verify(VerifyCodeCommand(request.email, request.code))
        return LoginResponse.from(result)
    }
}
