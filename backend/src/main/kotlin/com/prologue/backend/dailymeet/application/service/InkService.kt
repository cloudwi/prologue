package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.InkWallet
import com.prologue.backend.dailymeet.domain.repository.InkLedgerRepository
import com.prologue.backend.dailymeet.domain.repository.InkWalletRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 잉크 유스케이스. 지갑은 첫 접근에 환영 잉크와 함께 열린다(가입 훅이 따로 없어도 됨).
 * 소모는 부족하면 도메인이 막는다("잉크가 부족해요").
 *
 * 무료 지급은 환영 한 통어치뿐이다. 편지 한 통이 만원에 가까운 값이라, 주기적으로 나눠주면
 * 그 금액만큼을 매달 그냥 내주는 셈이 된다. 추가 지급은 이벤트(EVENT)나 CS(ADMIN_GRANT)처럼
 * 사람이 판단해 내보내는 경로로만 남긴다.
 */
@Service
class InkService(
    private val walletRepository: InkWalletRepository,
    private val ledgerRepository: InkLedgerRepository,
) {
    @Transactional
    fun balance(accountId: UUID): Int = walletOf(accountId).ink

    /** 지갑 화면용 — 잔액 + 최근 증감 내역. */
    @Transactional
    fun wallet(accountId: UUID): InkWalletView =
        walletOf(accountId).let { wallet ->
            InkWalletView(
                balance = wallet.ink,
                history = ledgerRepository.findRecent(accountId, HISTORY_LIMIT),
            )
        }

    /** 잉크 소모 — 값은 [InkPrice]에서 온다. 부족하면 도메인이 막는다. */
    @Transactional
    fun spend(accountId: UUID, amount: Int, reason: String) {
        val wallet = walletOf(accountId)
        wallet.spend(amount)
        walletRepository.save(wallet)
        ledgerRepository.append(accountId, -amount, reason)
    }

    /** 잉크 지급 — 이벤트 보상·편지 회수 환급 등. 반드시 원장에 출처를 남긴다. */
    @Transactional
    fun grantTo(accountId: UUID, amount: Int, reason: String) {
        val wallet = walletOf(accountId)
        wallet.grant(amount)
        walletRepository.save(wallet)
        ledgerRepository.append(accountId, amount, reason)
    }

    private fun walletOf(accountId: UUID): InkWallet =
        walletRepository.findByAccountId(accountId)
            ?: walletRepository.save(InkWallet.open(accountId)).also {
                ledgerRepository.append(accountId, InkPrice.WELCOME, REASON_WELCOME)
            }

    companion object {
        const val REASON_WELCOME = "WELCOME"
        const val REASON_EVENT = "EVENT"
        const val REASON_MAIL = "MAIL"
        /** 하트를 여러 번 보낸 보상. 원장에 "왜 늘었는지"가 남아야 한다. */
        const val REASON_HEART = "HEART"
        /** 인앱결제 충전. 정산·환불 대응 때 이 사유로 찾는다. */
        const val REASON_PURCHASE = "PURCHASE"
        /** 사흘이 지나 닫힌 프로필을 다시 연 값. */
        const val REASON_PROFILE_UNLOCK = "PROFILE_UNLOCK"
        /** 읽히지 않은 편지를 회수해 절반을 돌려받음. */
        const val REASON_MAIL_RECALL = "MAIL_RECALL"
        private const val HISTORY_LIMIT = 50
    }
}

data class InkWalletView(
    val balance: Int,
    val history: List<com.prologue.backend.dailymeet.domain.repository.InkLedgerEntry>,
)
