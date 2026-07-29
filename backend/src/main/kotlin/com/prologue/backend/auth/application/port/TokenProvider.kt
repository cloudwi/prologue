package com.prologue.backend.auth.application.port

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId

/**
 * 우리 서비스 JWT 발급/파싱 아웃 포트(SPI).
 * 인프라 계층(jjwt 등)이 구현한다.
 */
interface TokenProvider {
    /** 계정에 대해 access + refresh 토큰을 발급. */
    fun issue(account: Account): AuthTokens

    /** access token에서 인증 주체(계정 식별자+권한)를 복원. 서명·만료·타입 검증 포함, 유효하지 않으면 null. */
    fun resolveAuthentication(accessToken: String): AuthenticatedPrincipal?

    /** refresh token에서 계정 식별자를 복원. 서명·만료·타입(refresh) 검증 포함, 유효하지 않으면 null. */
    fun resolveRefreshSubject(refreshToken: String): AccountId?
}
