package com.prologue.backend.auth.interfaces.rest.dto

import jakarta.validation.constraints.NotBlank

/**
 * 소셜 로그인 요청 본문.
 * [token]: 앱이 소셜 SDK로 받은 자격증명(카카오/네이버=access token, 구글/애플=id token).
 */
data class SocialLoginRequest(
    @field:NotBlank(message = "token은 필수입니다")
    val token: String,
)
