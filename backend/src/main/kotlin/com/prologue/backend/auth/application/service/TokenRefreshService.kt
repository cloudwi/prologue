package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.repository.AccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** 유효하지 않거나 만료된 refresh token. (→ 401, 앱은 재로그인으로 보낸다) */
class InvalidRefreshTokenException : RuntimeException("다시 로그인해주세요")

/**
 * 토큰 재발급 유스케이스.
 * refresh token을 검증해 access+refresh를 새로 발급한다(회전) — 쓰인 refresh는 버려진다.
 * 계정이 정지·탈퇴 상태면 거부해, 오래 살아 있는 refresh로 제재를 우회하지 못하게 한다.
 */
@Service
class TokenRefreshService(
    private val tokenProvider: TokenProvider,
    private val accountRepository: AccountRepository,
) {
    @Transactional(readOnly = true)
    fun refresh(refreshToken: String): AuthTokens {
        val accountId = tokenProvider.resolveRefreshSubject(refreshToken) ?: throw InvalidRefreshTokenException()
        val account = accountRepository.findById(accountId) ?: throw InvalidRefreshTokenException()
        if (!account.isActive()) throw InvalidRefreshTokenException()
        return tokenProvider.issue(account)
    }
}
