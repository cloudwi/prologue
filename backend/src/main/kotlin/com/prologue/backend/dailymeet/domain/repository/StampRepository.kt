package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.StampWallet
import java.util.UUID

interface StampWalletRepository {
    fun findByAccountId(accountId: UUID): StampWallet?
    fun save(wallet: StampWallet): StampWallet
}

/** 우표 증감 한 줄 — 지갑 화면의 사용 내역에 그대로 보여준다. */
data class StampLedgerEntry(
    val amount: Int,
    val reason: String,
    val createdAt: java.time.Instant,
)

/** 우표 증감 원장 — 잔액의 출처를 설명하는 기록. */
interface StampLedgerRepository {
    fun append(accountId: UUID, amount: Int, reason: String)

    /** 최근 내역, 최신순. */
    fun findRecent(accountId: UUID, limit: Int): List<StampLedgerEntry>

    /** 특정 사유의 마지막 기록 시각 — 주간 지급처럼 "이번 주에 받았나"를 판정할 때. */
    fun latestAt(accountId: UUID, reason: String): java.time.Instant?
}
