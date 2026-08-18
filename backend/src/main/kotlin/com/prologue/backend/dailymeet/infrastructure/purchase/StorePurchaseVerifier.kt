package com.prologue.backend.dailymeet.infrastructure.purchase

import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
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
 * iOS는 아직 검증기가 없다 — App Store Server API 검증기가 붙을 때까지 거절한다.
 */
@Component
class StorePurchaseVerifier(
    private val googlePlay: GooglePlayPurchaseVerifier,
) : PurchaseVerifier {
    override fun verify(platform: StorePlatform, productId: String, token: String): VerifiedPurchase =
        when (platform) {
            StorePlatform.ANDROID -> googlePlay.verify(productId, token)
            StorePlatform.IOS -> throw PurchaseVerificationException("iOS 결제 검증이 아직 설정되지 않았습니다")
        }
}
