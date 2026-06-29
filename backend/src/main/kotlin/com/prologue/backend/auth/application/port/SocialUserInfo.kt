package com.prologue.backend.auth.application.port

import com.prologue.backend.auth.domain.model.SocialProvider

/**
 * 소셜 제공자 토큰을 검증해 얻은 사용자 정보.
 *
 * - [providerUserId]: 제공자가 부여한 고유 식별자 (계정 매핑의 자연키)
 * - [email]/[nickname]: 선택. 신규 가입 시 Member 프로필 초기값으로 활용 가능(제공자/동의범위에 따라 없을 수 있음).
 */
data class SocialUserInfo(
    val provider: SocialProvider,
    val providerUserId: String,
    val email: String? = null,
    val nickname: String? = null,
)
