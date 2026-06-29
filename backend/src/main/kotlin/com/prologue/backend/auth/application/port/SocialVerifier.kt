package com.prologue.backend.auth.application.port

import com.prologue.backend.auth.domain.model.SocialProvider

/**
 * 소셜 토큰 검증 아웃 포트(SPI).
 *
 * 앱이 소셜 SDK로 받은 자격증명을 백엔드가 각 제공자 서버에 검증한다.
 * [rawToken]의 실제 종류는 제공자마다 다르다:
 * - KAKAO / NAVER: access token (제공자 사용자 API 호출로 검증)
 * - GOOGLE / APPLE: id token (서명·aud·iss 검증)
 *
 * 인프라 계층이 제공자별로 구현/디스패치한다.
 */
interface SocialVerifier {
    fun verify(provider: SocialProvider, rawToken: String): SocialUserInfo
}
