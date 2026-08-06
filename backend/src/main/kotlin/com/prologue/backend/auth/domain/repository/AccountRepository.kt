package com.prologue.backend.auth.domain.repository

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import java.time.Instant

/**
 * Account 애그리거트의 영속성 포트(아웃바운드).
 * 도메인이 인터페이스를 소유하고, 인프라 계층(JPA)이 구현한다 — 의존 방향을 도메인 안쪽으로 유지.
 */
interface AccountRepository {

    fun findById(id: AccountId): Account?

    /** 이메일 자연키로 계정 조회. 로그인 시 "기존 계정 찾기"의 핵심. email은 정규화된 형태로 전달한다. */
    fun findByEmail(email: String): Account?

    fun save(account: Account): Account

    /** 최근 접속을 [now]로 기록한다 — 기존 값이 [threshold] 이후면 갱신하지 않는다(스로틀). */
    fun touchLastSeen(id: AccountId, now: Instant, threshold: Instant)

    /** 최근 접속 시각. 접속 기록이 없으면 null. */
    fun findLastSeenAt(id: AccountId): Instant?
}
