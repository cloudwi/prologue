package com.prologue.backend.dailymeet.infrastructure.purchase

import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
import org.springframework.web.client.RestClient
import tools.jackson.databind.json.JsonMapper
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

class GooglePlayPurchaseVerifierTest {

    private fun verifier(json: String = "") =
        GooglePlayPurchaseVerifier("day.prologue.app", json, RestClient.builder(), JsonMapper.builder().build())

    @Test
    fun `키가 없으면 configured=false이고 검증은 거절된다 - 닫힌 쪽이 기본값`() {
        val v = verifier()
        assertFalse(v.configured)
        assertFailsWith<PurchaseVerificationException> { v.verify("ink_50", "token") }
    }

    @Test
    fun `구매 완료(purchaseState 0)만 통과하고 주문번호가 거래 id가 된다`() {
        val v = verifier()
        val result = v.interpret(
            GooglePlayPurchaseVerifier.ProductPurchase(purchaseState = 0, orderId = "GPA.1234-5678", productId = "ink_50"),
            requestedProductId = "ink_50",
            purchaseToken = "tok",
        )
        assertEquals("GPA.1234-5678", result.transactionId)
        assertEquals("ink_50", result.productId)
    }

    @Test
    fun `주문번호가 없는 테스트 결제는 토큰이 거래 id가 된다`() {
        val v = verifier()
        val result = v.interpret(
            GooglePlayPurchaseVerifier.ProductPurchase(purchaseState = 0, orderId = null, productId = null, purchaseType = 0),
            requestedProductId = "ink_150",
            purchaseToken = "tok-abc",
        )
        assertEquals("tok-abc", result.transactionId)
        assertEquals("ink_150", result.productId)
    }

    @Test
    fun `취소(1)와 보류(2)는 거절한다 - pending에 잉크를 주면 취소돼도 잉크가 남는다`() {
        val v = verifier()
        assertFailsWith<PurchaseVerificationException> {
            v.interpret(GooglePlayPurchaseVerifier.ProductPurchase(purchaseState = 1), "ink_50", "t")
        }
        assertFailsWith<PurchaseVerificationException> {
            v.interpret(GooglePlayPurchaseVerifier.ProductPurchase(purchaseState = 2), "ink_50", "t")
        }
        assertFailsWith<PurchaseVerificationException> {
            v.interpret(GooglePlayPurchaseVerifier.ProductPurchase(purchaseState = null), "ink_50", "t")
        }
    }

    @Test
    fun `구글이 알려준 상품 id가 요청과 다르면 그대로 돌려준다 - 판단은 서비스가 한다`() {
        val v = verifier()
        val result = v.interpret(
            GooglePlayPurchaseVerifier.ProductPurchase(purchaseState = 0, orderId = "GPA.1", productId = "ink_50"),
            requestedProductId = "ink_250",
            purchaseToken = "t",
        )
        assertEquals("ink_50", result.productId)
    }
}
