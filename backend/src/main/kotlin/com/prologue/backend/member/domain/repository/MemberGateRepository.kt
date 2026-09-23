package com.prologue.backend.member.domain.repository

import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.MemberGate
import java.time.Instant
import java.util.UUID

/** 성비 게이트 대기열 영속성 포트. */
interface MemberGateRepository {
    fun save(gate: MemberGate): MemberGate

    fun findByAccountId(accountId: UUID): MemberGate?

    /** 지금 기다리는 사람 전부의 계정 id — 후보 선정이 한 번에 읽어 걸러낸다(N+1 금지). */
    fun findAllWaitingIds(): Set<UUID>

    /** 오래 기다린 순으로 [limit]명 — 자동 입장이 이 순서로 들인다. */
    fun findWaitingOrdered(limit: Int): List<MemberGate>

    fun countWaiting(): Int

    /** 내 앞에 몇 명이 있나(1부터). 기다리는 중이 아니면 null. */
    fun waitingPosition(accountId: UUID): Int?

    /**
     * 활성 회원 수를 성별로 센다 — 계정이 ACTIVE이고 [since] 이후에 접속한 프로필.
     * 게이트의 비율 계산은 가입자 수가 아니라 이 값을 본다. 떠난 사람은 성비에 없다.
     */
    fun countActiveByGender(since: Instant): Map<Gender, Int>
}
