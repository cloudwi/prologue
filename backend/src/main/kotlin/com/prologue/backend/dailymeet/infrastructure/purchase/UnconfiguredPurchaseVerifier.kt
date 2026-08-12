package com.prologue.backend.dailymeet.infrastructure.purchase

import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
import com.prologue.backend.dailymeet.application.port.PurchaseVerifier
import com.prologue.backend.dailymeet.domain.model.StorePlatform
import org.springframework.stereotype.Component

/**
 * 스토어 검증 자격증명이 아직 없을 때 쓰이는 기본 구현 — 모든 결제를 거절한다.
 *
 * 사진 검수처럼 "설정이 없으면 통과"시키는 방식을 여기서는 쓸 수 없다. 검수는 통과시켜도
 * 사진 한 장이 잘못 올라갈 뿐이지만, 결제는 통과시키는 순간 아무나 잉크를 무한히 받아간다.
 * 그래서 열려 있는 쪽이 아니라 닫혀 있는 쪽을 기본값으로 둔다.
 *
 * 조건 없이 등록한다. 예전에는 @ConditionalOnMissingBean을 달아 "진짜 검증기가 생기면 물러나게"
 * 해뒀는데, 그 애노테이션은 자동 구성(auto-configuration) 클래스에서만 순서가 보장된다.
 * 일반 컴포넌트 스캔에서는 평가 시점이 정해지지 않아 이 빈이 통째로 등록되지 않았고,
 * 애플리케이션이 뜨지 못했다.
 *
 * 실제 검증기(구글 Play Developer API / 애플 App Store Server API)를 붙일 때는
 * 그쪽에 @Primary를 달면 된다 — 조건이 아니라 우선순위로 고르는 편이 순서에 기대지 않는다.
 */
@Component
class UnconfiguredPurchaseVerifier : PurchaseVerifier {
    override fun verify(platform: StorePlatform, productId: String, token: String): Nothing =
        throw PurchaseVerificationException("결제 검증이 아직 설정되지 않았습니다 ($platform)")
}
