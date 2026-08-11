package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.repository.AccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 계정 정보 조회 — 다른 컨텍스트(Member 등)가 계정의 읽기 전용 정보를 물어볼 때 쓰는 창구.
 * 리포지토리를 직접 열어주는 대신 이 서비스를 통하게 해서, 계정을 고칠 수 있는 통로는 auth 안에 남긴다.
 */
@Service
class AccountQueryService(
    private val accountRepository: AccountRepository,
) {
    /** 로그인에 쓰는 이메일. 계정이 없으면 null. */
    @Transactional(readOnly = true)
    fun findEmail(accountId: UUID): String? =
        accountRepository.findById(AccountId(accountId))?.email
}
