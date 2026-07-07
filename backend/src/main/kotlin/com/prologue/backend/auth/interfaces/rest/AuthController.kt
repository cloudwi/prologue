package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.service.EmailAuthService
import com.prologue.backend.auth.application.service.EmailLoginCommand
import com.prologue.backend.auth.application.service.EmailSignupCommand
import com.prologue.backend.auth.interfaces.rest.dto.EmailLoginRequest
import com.prologue.backend.auth.interfaces.rest.dto.EmailSignupRequest
import com.prologue.backend.auth.interfaces.rest.dto.LoginResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * 이메일 가입/로그인 엔드포인트.
 * 앱은 이메일·비밀번호를 보내 우리 JWT를 발급받는다.
 */
@RestController
@RequestMapping("/auth")
class AuthController(
    private val emailAuthService: EmailAuthService,
) {
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    fun signup(@Valid @RequestBody request: EmailSignupRequest): LoginResponse {
        val result = emailAuthService.signup(EmailSignupCommand(request.email, request.password))
        return LoginResponse.from(result)
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: EmailLoginRequest): LoginResponse {
        val result = emailAuthService.login(EmailLoginCommand(request.email, request.password))
        return LoginResponse.from(result)
    }
}
