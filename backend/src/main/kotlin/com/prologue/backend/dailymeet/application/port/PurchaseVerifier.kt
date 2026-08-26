package com.prologue.backend.dailymeet.application.port

import com.prologue.backend.dailymeet.domain.model.StorePlatform

/**
 * 영수증 검증 포트 — "이 결제가 정말 일어났는가"를 스토어에 직접 물어본다.
 *
 * 앱이 보낸 말을 믿지 않는 이유는 단순하다. 앱은 유저 손에 있고, 손에 있는 것은 바꿀 수 있다.
 * 잉크는 돈이므로 지급의 근거는 반드시 스토어의 답이어야 한다.
 */
interface PurchaseVerifier {
    /**
     * @param token 안드로이드는 purchase token, iOS는 StoreKit 2가 서명한 거래(JWS)
     * @return 스토어가 확인해 준 거래. 확인되지 않으면 [PurchaseVerificationException]을 던진다.
     */
    fun verify(platform: StorePlatform, productId: String, token: String): VerifiedPurchase
}

/**
 * 스토어가 확인해 준 거래.
 * @param transactionId 중복 지급을 막는 열쇠. 스토어가 부여한 값을 그대로 쓴다.
 */
data class VerifiedPurchase(val transactionId: String, val productId: String)

class PurchaseVerificationException(message: String) : RuntimeException(message)
