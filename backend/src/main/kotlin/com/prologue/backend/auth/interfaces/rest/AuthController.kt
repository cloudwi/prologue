package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.service.SocialLoginCommand
import com.prologue.backend.auth.application.service.SocialLoginService
import com.prologue.backend.auth.domain.model.SocialProvider
import com.prologue.backend.auth.interfaces.rest.dto.LoginResponse
import com.prologue.backend.auth.interfaces.rest.dto.SocialLoginRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 소셜 로그인 엔드포인트.
 * 앱은 소셜 SDK 토큰을 `POST /auth/login/{provider}` 로 보내 우리 JWT를 발급받는다.
 */
@RestController
@RequestMapping("/auth")
class AuthController(
    private val socialLoginService: SocialLoginService,
) {
    @PostMapping("/login/{provider}")
    fun login(
        @PathVariable provider: String,
        @Valid @RequestBody request: SocialLoginRequest,
    ): LoginResponse {
        val socialProvider = parseProvider(provider)
        val result = socialLoginService.login(SocialLoginCommand(socialProvider, request.token))
        return LoginResponse.from(result)
    }

    private fun parseProvider(raw: String): SocialProvider =
        SocialProvider.entries.firstOrNull { it.name.equals(raw, ignoreCase = true) }
            ?: throw UnsupportedSocialProviderException(raw)
}
