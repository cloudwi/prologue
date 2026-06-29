package com.prologue.backend.auth.domain.repository

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.SocialProvider

/**
 * Account 애그리거트의 영속성 포트(아웃바운드).
 * 도메인이 인터페이스를 소유하고, 인프라 계층(JPA)이 구현한다 — 의존 방향을 도메인 안쪽으로 유지.
 */
interface AccountRepository {

    fun findById(id: AccountId): Account?

    /** 소셜 연결 자연키로 계정 조회. 로그인 시 "기존 계정 찾기"의 핵심. */
    fun findBySocialConnection(provider: SocialProvider, providerUserId: String): Account?

    fun save(account: Account): Account
}
