package com.prologue.backend.auth.infrastructure.oauth

import com.prologue.backend.auth.application.port.SocialUserInfo
import com.prologue.backend.auth.domain.model.SocialProvider

/**
 * 단일 소셜 제공자에 대한 토큰 검증 클라이언트.
 * 제공자마다 구현체를 추가하면 [SocialVerifierDispatcher]가 자동으로 묶는다.
 */
interface SocialClient {
    val provider: SocialProvider

    /** 제공자 토큰으로 사용자 정보를 조회·검증한다. 실패 시 SocialVerificationException. */
    fun fetchUser(accessToken: String): SocialUserInfo
}
