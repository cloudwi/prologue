package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
import com.prologue.backend.dailymeet.application.port.PurchaseVerifier
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.StampProduct
import com.prologue.backend.dailymeet.domain.model.StampPurchase
import com.prologue.backend.dailymeet.domain.model.StorePlatform
import com.prologue.backend.dailymeet.domain.repository.StampPurchaseRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 우표 충전 — 스토어 결제를 확인하고 우표를 지급한다.
 *
 * 순서가 중요하다. 상품 확인 → 스토어 검증 → 기록 → 지급.
 * 기록이 지급보다 먼저인 이유는, 기록에 걸린 유니크 제약이 중복 지급을 막는 자물쇠이기 때문이다.
 * 지급을 먼저 하면 그 사이 같은 요청이 한 번 더 들어왔을 때 두 번 지급될 수 있다.
 *
 * 앱은 이 호출이 성공한 뒤에야 스토어 거래를 소비(consume/finish)해야 한다.
 * 먼저 소비해 버리면 서버 지급이 실패했을 때 유저는 돈만 내고 우표를 못 받는다.
 */
@Service
class StampPurchaseService(
    private val verifier: PurchaseVerifier,
    private val purchaseRepository: StampPurchaseRepository,
    private val stampService: StampService,
) {
    @Transactional
    fun purchase(accountId: UUID, platform: StorePlatform, productId: String, token: String): PurchaseResult {
        val product = StampProduct.of(productId)
            ?: throw DailyMeetException("알 수 없는 상품이에요")

        val verified = try {
            verifier.verify(platform, productId, token)
        } catch (e: PurchaseVerificationException) {
            throw DailyMeetException("결제를 확인하지 못했어요. 결제가 완료됐다면 잠시 후 다시 시도해 주세요")
        }

        // 스토어가 알려준 상품이 우리가 지급하려는 상품과 같아야 한다 —
        // 싼 상품을 사고 비싼 상품 id를 보내는 시도를 여기서 막는다.
        if (verified.productId != product.productId) {
            throw DailyMeetException("결제 내역이 상품과 맞지 않아요")
        }

        val recorded = purchaseRepository.saveIfNew(
            StampPurchase.record(accountId, platform, product, verified.transactionId),
        )
        // 이미 처리한 거래 — 앱의 재시도다. 오류로 만들지 않고 현재 잔액만 돌려준다.
        // (여기서 실패로 답하면 앱은 거래를 소비하지 못한 채 영원히 재시도한다)
        if (!recorded) {
            return PurchaseResult(granted = 0, balance = stampService.balance(accountId), alreadyProcessed = true)
        }

        stampService.grantTo(accountId, product.stamps, StampService.REASON_PURCHASE)
        return PurchaseResult(
            granted = product.stamps,
            balance = stampService.balance(accountId),
            alreadyProcessed = false,
        )
    }
}

data class PurchaseResult(
    /** 이번 호출로 지급한 우표 수. 이미 처리된 거래면 0. */
    val granted: Int,
    val balance: Int,
    /** 앱이 "이미 처리됨"과 "방금 지급"을 구분해 안내할 수 있게. */
    val alreadyProcessed: Boolean,
)
