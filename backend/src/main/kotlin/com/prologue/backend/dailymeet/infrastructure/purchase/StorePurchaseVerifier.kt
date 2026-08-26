package com.prologue.backend.dailymeet.infrastructure.purchase

import com.prologue.backend.dailymeet.application.port.PurchaseVerifier
import com.prologue.backend.dailymeet.application.port.VerifiedPurchase
import com.prologue.backend.dailymeet.domain.model.StorePlatform
import org.springframework.stereotype.Component

/**
 * 플랫폼별 검증기로 갈라 보내는 [PurchaseVerifier] 구현.
 *
 * 각 플랫폼 검증기는 자격증명이 없으면 스스로 거절한다. 그래서 설정이 안 된 플랫폼의 결제는
 * 예전 UnconfiguredPurchaseVerifier와 똑같이 막힌다 — 열린 쪽이 아니라 닫힌 쪽이 기본값.
 * 잉크는 돈이라, "설정이 없으면 통과"는 여기서 쓸 수 없다.
 *
 * iOS는 애플 서버에 되묻지 않는다 — StoreKit 2의 서명된 거래(JWS)를 우리가 직접 검증한다.
 * 자세한 이유는 [AppleAppStorePurchaseVerifier].
 */
@Component
class StorePurchaseVerifier(
    private val googlePlay: GooglePlayPurchaseVerifier,
    private val apple: AppleAppStorePurchaseVerifier,
) : PurchaseVerifier {
    override fun verify(platform: StorePlatform, productId: String, token: String): VerifiedPurchase =
        when (platform) {
            StorePlatform.ANDROID -> googlePlay.verify(productId, token)
            StorePlatform.IOS -> apple.verify(productId, token)
        }
}
