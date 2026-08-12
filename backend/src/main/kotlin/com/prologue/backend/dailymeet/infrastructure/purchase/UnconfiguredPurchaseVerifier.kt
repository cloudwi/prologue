package com.prologue.backend.dailymeet.infrastructure.purchase

import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
import com.prologue.backend.dailymeet.application.port.PurchaseVerifier
import com.prologue.backend.dailymeet.domain.model.StorePlatform
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean
import org.springframework.stereotype.Component

/**
 * 스토어 검증 자격증명이 아직 없을 때 쓰이는 기본 구현 — 모든 결제를 거절한다.
 *
 * 사진 검수처럼 "설정이 없으면 통과"시키는 방식을 여기서는 쓸 수 없다. 검수는 통과시켜도
 * 사진 한 장이 잘못 올라갈 뿐이지만, 결제는 통과시키는 순간 아무나 우표를 무한히 받아간다.
 * 그래서 열려 있는 쪽이 아니라 닫혀 있는 쪽을 기본값으로 둔다.
 *
 * 실제 검증기(구글 Play Developer API / 애플 App Store Server API)가 빈으로 등록되면
 * 이 구현은 물러난다.
 */
@Component
@ConditionalOnMissingBean(PurchaseVerifier::class)
class UnconfiguredPurchaseVerifier : PurchaseVerifier {
    override fun verify(platform: StorePlatform, productId: String, token: String) : Nothing =
        throw PurchaseVerificationException("결제 검증이 아직 설정되지 않았습니다 ($platform)")
}
