package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.InkWallet
import com.prologue.backend.dailymeet.domain.repository.InkLedgerRepository
import com.prologue.backend.dailymeet.domain.repository.InkWalletRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/**
 * 잉크 유스케이스. 지갑은 첫 접근에 환영 잉크와 함께 열린다(가입 훅이 따로 없어도 됨).
 * 소모는 부족하면 도메인이 막는다("잉크가 부족해요").
 *
 * 무료 지급은 둘뿐이다 — 환영 한 통어치, 그리고 오늘의 답변에 하루 한 번 고이는 소량([InkPrice.DAILY_ANSWER]).
 * 편지 한 통이 만원에 가까운 값이라 주기적으로 나눠주면 그 금액을 매달 그냥 내주는 셈이 되는데,
 * 답변 보상은 하루 한 문답이라 상한이 저절로 서고, 답을 남기는 일 자체가 이 앱의 공급이라
 * 보상해도 앱에 이롭다. 그 밖의 지급은 이벤트(EVENT)나 CS(ADMIN_GRANT)처럼 사람이 판단해 내보낸다.
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

    /**
     * 오늘의 답변 보상 — 하루(KST) 한 번만 [InkPrice.DAILY_ANSWER]을 지급한다.
     *
     * "새 답변을 썼을 때"가 아니라 "오늘 아직 안 받았을 때"를 기준으로 삼는다. 질문은 풀을 한 바퀴 돌면
     * 다시 오고, 그날의 답변은 새로 쓰이는 게 아니라 고쳐 쓰이는데, 그날도 답을 남긴 건 마찬가지라서다.
     * 원장(ANSWER 사유의 마지막 시각)이 판정의 근거라, 스케줄러 없이도 하루 한 번이 지켜진다.
     *
     * @return 지급한 잉크. 오늘 이미 받았으면 0.
     */
    @Transactional
    fun rewardDailyAnswer(accountId: UUID): Int {
        val todayStart = LocalDate.now(KST).atStartOfDay(KST).toInstant()
        val last = ledgerRepository.latestAt(accountId, REASON_ANSWER)
        if (last != null && !last.isBefore(todayStart)) return 0
        grantTo(accountId, InkPrice.DAILY_ANSWER, REASON_ANSWER)
        return InkPrice.DAILY_ANSWER
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
        /** 오늘의 답변 보상 — 하루 한 번. 판정도 이 사유의 마지막 시각으로 한다. */
        const val REASON_ANSWER = "ANSWER"
        /** 하트를 여러 번 보낸 보상(폐지됨 — 옛 원장에만 남아 있다). */
        const val REASON_HEART = "HEART"
        /** 인앱결제 충전. 정산·환불 대응 때 이 사유로 찾는다. */
        const val REASON_PURCHASE = "PURCHASE"
        /** 사흘이 지나 닫힌 프로필을 다시 연 값. */
        const val REASON_PROFILE_UNLOCK = "PROFILE_UNLOCK"
        /** 읽히지 않은 편지를 회수해 절반을 돌려받음. */
        const val REASON_MAIL_RECALL = "MAIL_RECALL"
        private const val HISTORY_LIMIT = 50
        private val KST = ZoneId.of("Asia/Seoul")
    }
}

data class InkWalletView(
    val balance: Int,
    val history: List<com.prologue.backend.dailymeet.domain.repository.InkLedgerEntry>,
)
