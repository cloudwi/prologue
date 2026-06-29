package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.domain.model.SocialProvider

/**
 * 소셜 로그인 유스케이스 입력.
 * - [provider]: 어떤 소셜로 로그인하는지
 * - [token]: 앱이 소셜 SDK로 받은 자격증명(access token 또는 id token)
 */
data class SocialLoginCommand(
    val provider: SocialProvider,
    val token: String,
)
