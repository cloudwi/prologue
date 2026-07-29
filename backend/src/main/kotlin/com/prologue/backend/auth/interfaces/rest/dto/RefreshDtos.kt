package com.prologue.backend.auth.interfaces.rest.dto

import com.prologue.backend.auth.application.port.AuthTokens
import jakarta.validation.constraints.NotBlank

data class RefreshRequest(
    @field:NotBlank(message = "refresh token이 필요합니다")
    val refreshToken: String,
)

data class RefreshResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long,
) {
    companion object {
        fun from(tokens: AuthTokens): RefreshResponse =
            RefreshResponse(tokens.accessToken, tokens.refreshToken, tokens.accessTokenExpiresInSeconds)
    }
}
