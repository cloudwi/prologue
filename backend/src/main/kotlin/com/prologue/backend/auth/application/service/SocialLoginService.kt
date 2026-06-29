package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.application.port.SocialUserInfo
import com.prologue.backend.auth.application.port.SocialVerifier
import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.domain.model.SocialConnection
import com.prologue.backend.auth.domain.repository.AccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 소셜 로그인 유스케이스 (애플리케이션 서비스).
 *
 * 흐름:
 * 1. 소셜 토큰 검증([SocialVerifier]) → 제공자 사용자 정보
 * 2. 소셜 연결 자연키로 기존 계정 조회 → 없으면 신규 등록 (find-or-create)
 * 3. 정지/탈퇴 계정이면 로그인 차단
 * 4. 우리 JWT 발급([TokenProvider])
 *
 * 트랜잭션 경계는 이 서비스가 소유한다. (kotlin("plugin.spring")이 @Service/@Transactional 클래스를 open 처리)
 */
@Service
class SocialLoginService(
    private val socialVerifier: SocialVerifier,
    private val accountRepository: AccountRepository,
    private val tokenProvider: TokenProvider,
) {
    @Transactional
    fun login(command: SocialLoginCommand): LoginResult {
        val userInfo: SocialUserInfo = socialVerifier.verify(command.provider, command.token)

        val existing = accountRepository.findBySocialConnection(userInfo.provider, userInfo.providerUserId)
        val isNewUser = existing == null

        val account = existing?.also { ensureLoginable(it) }
            ?: registerNewAccount(userInfo)

        val accountId = requireNotNull(account.id) { "영속화된 계정은 반드시 id를 가진다" }
        val tokens = tokenProvider.issue(account)
        return LoginResult(accountId = accountId, tokens = tokens, isNewUser = isNewUser)
    }

    private fun registerNewAccount(userInfo: SocialUserInfo): Account {
        val account = Account.register(SocialConnection(userInfo.provider, userInfo.providerUserId))
        return accountRepository.save(account)
    }

    private fun ensureLoginable(account: Account) {
        if (!account.isActive()) {
            throw AuthDomainException("로그인할 수 없는 계정 상태입니다 (${account.status})")
        }
    }
}
