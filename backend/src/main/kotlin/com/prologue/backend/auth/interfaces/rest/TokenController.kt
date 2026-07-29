package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.service.TokenRefreshService
import com.prologue.backend.auth.interfaces.rest.dto.RefreshRequest
import com.prologue.backend.auth.interfaces.rest.dto.RefreshResponse
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 토큰 재발급. 인증 헤더 없이 refresh token 본문으로 호출한다(auth 하위 경로는 permitAll).
 * 앱은 401/403을 만나면 여기로 한 번 재발급을 시도하고 원래 요청을 다시 보낸다.
 */
@RestController
@RequestMapping("/auth")
class TokenController(
    private val tokenRefreshService: TokenRefreshService,
) {
    @PostMapping("/refresh")
    fun refresh(@Valid @RequestBody request: RefreshRequest): RefreshResponse =
        RefreshResponse.from(tokenRefreshService.refresh(request.refreshToken))
}
