package com.prologue.backend.auth.domain.model

/**
 * 지원하는 소셜 로그인 제공자.
 * APPLE은 정책상 iOS 클라이언트에서만 노출되지만, 도메인 레벨에선 동등하게 취급한다.
 */
enum class SocialProvider {
    KAKAO,
    NAVER,
    GOOGLE,
    APPLE,
}
