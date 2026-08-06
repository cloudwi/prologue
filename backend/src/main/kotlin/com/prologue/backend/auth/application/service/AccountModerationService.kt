package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.domain.repository.AccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 계정 제재 — 신고 검토(어드민)에서 쓴다.
 * 정지된 계정은 로그인(이메일 인증)이 거부되고, 발급된 토큰은 만료로 자연 소멸한다.
 */
@Service
class AccountModerationService(
    private val accountRepository: AccountRepository,
) {
    @Transactional
    fun suspend(accountId: UUID) {
        val account = accountRepository.findById(AccountId(accountId))
            ?: throw AuthDomainException("계정을 찾을 수 없다")
        account.suspend()
        accountRepository.save(account)
    }
}
