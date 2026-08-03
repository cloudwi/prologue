package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.StampWallet
import com.prologue.backend.dailymeet.domain.repository.StampLedgerRepository
import com.prologue.backend.dailymeet.domain.repository.StampWalletRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 우표 유스케이스. 지갑은 첫 접근에 환영 우표와 함께 열린다(가입 훅이 따로 없어도 됨).
 * 소모는 부족하면 도메인이 막는다("우표가 부족해요"). 충전(IAP)은 출시 직전에 붙는다.
 */
@Service
class StampService(
    private val walletRepository: StampWalletRepository,
    private val ledgerRepository: StampLedgerRepository,
) {
    @Transactional
    fun balance(accountId: UUID): Int = walletOf(accountId).balance

    /** 지갑 화면용 — 잔액 + 최근 증감 내역. */
    @Transactional
    fun wallet(accountId: UUID): StampWalletView =
        StampWalletView(
            balance = walletOf(accountId).balance,
            history = ledgerRepository.findRecent(accountId, HISTORY_LIMIT),
        )

    @Transactional
    fun spendOne(accountId: UUID, reason: String) {
        val wallet = walletOf(accountId)
        wallet.spend(1)
        walletRepository.save(wallet)
        ledgerRepository.append(accountId, -1, reason)
    }

    /** 우표 지급 — 이벤트 보상 등. 반드시 원장에 출처를 남긴다. */
    @Transactional
    fun grantTo(accountId: UUID, amount: Int, reason: String) {
        val wallet = walletOf(accountId)
        wallet.grant(amount)
        walletRepository.save(wallet)
        ledgerRepository.append(accountId, amount, reason)
    }

    private fun walletOf(accountId: UUID): StampWallet =
        walletRepository.findByAccountId(accountId)
            ?: walletRepository.save(StampWallet.open(accountId)).also {
                ledgerRepository.append(accountId, StampWallet.WELCOME_STAMPS, REASON_WELCOME)
            }

    companion object {
        const val REASON_WELCOME = "WELCOME"
        const val REASON_CONVERSATION_REQUEST = "CONVERSATION_REQUEST"
        const val REASON_EVENT = "EVENT"
        private const val HISTORY_LIMIT = 50
    }
}

data class StampWalletView(
    val balance: Int,
    val history: List<com.prologue.backend.dailymeet.domain.repository.StampLedgerEntry>,
)
