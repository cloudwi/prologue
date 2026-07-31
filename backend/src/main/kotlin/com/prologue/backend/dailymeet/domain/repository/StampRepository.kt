package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.StampWallet
import java.util.UUID

interface StampWalletRepository {
    fun findByAccountId(accountId: UUID): StampWallet?
    fun save(wallet: StampWallet): StampWallet
}

/** 우표 증감 원장 — 잔액의 출처를 설명하는 기록. 조회는 아직 없고 감사·CS용으로 쌓는다. */
interface StampLedgerRepository {
    fun append(accountId: UUID, amount: Int, reason: String)
}
