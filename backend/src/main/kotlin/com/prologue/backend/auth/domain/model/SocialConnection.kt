package com.prologue.backend.auth.domain.model

/**
 * 하나의 소셜 계정 연결을 나타내는 값 객체(VO).
 *
 * - [provider]: 소셜 제공자
 * - [providerUserId]: 해당 제공자가 부여한 고유 사용자 식별자(카카오 회원번호, 애플 sub 등). 문자열로 통일.
 *
 * (provider, providerUserId) 조합이 전 시스템에서 한 계정을 가리키는 자연키 역할을 한다.
 */
data class SocialConnection(
    val provider: SocialProvider,
    val providerUserId: String,
) {
    init {
        require(providerUserId.isNotBlank()) { "providerUserId는 비어 있을 수 없다" }
    }
}
