package com.prologue.backend.dailymeet.infrastructure.purchase

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
import com.prologue.backend.dailymeet.application.port.VerifiedPurchase
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import tools.jackson.databind.ObjectMapper

/**
 * 구글 Play Developer API로 안드로이드 결제를 확인한다 — `purchases.products.get`.
 *
 * 앱이 보낸 purchaseToken을 구글에 되물어, 구글이 "이 토큰은 이 상품을 산 거래이고 결제가 완료됐다"고
 * 답할 때만 통과시킨다. 결제 상태가 pending(0이 아님)이거나 취소됐으면 거절한다.
 *
 * 인증은 Play Console에 초대된 서비스 계정 키(GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)로 한다.
 * 그 계정에는 Play Console "재무 데이터 보기" 권한이 있어야 이 API가 열린다.
 * 키가 비어 있으면 검증하지 않고 거절한다 — 열린 쪽이 아니라 닫힌 쪽이 기본값이다(잉크는 돈이다).
 */
@Component
class GooglePlayPurchaseVerifier(
    @param:Value("\${store.google-play.package-name}") private val packageName: String,
    @param:Value("\${store.google-play.service-account-json:}") serviceAccountJson: String,
    restClientBuilder: RestClient.Builder,
    objectMapper: ObjectMapper,
) {
    private val client = restClientBuilder.build()

    /** 키가 없으면 null — configured=false. 있으면 토큰 제공자가 서 있는다. */
    private val tokens: GoogleServiceAccountTokenProvider? =
        serviceAccountJson.takeIf { it.isNotBlank() }?.let {
            GoogleServiceAccountTokenProvider(it, SCOPE, restClientBuilder, objectMapper)
        }

    val configured: Boolean get() = tokens != null

    fun verify(productId: String, purchaseToken: String): VerifiedPurchase {
        val tokens = tokens ?: throw PurchaseVerificationException("구글 결제 검증이 설정되지 않았습니다")

        val purchase = try {
            client.get()
                .uri("$ENDPOINT/applications/{pkg}/purchases/products/{productId}/tokens/{token}", packageName, productId, purchaseToken)
                .header("Authorization", "Bearer ${tokens.accessToken()}")
                .retrieve()
                .body(ProductPurchase::class.java)
                ?: throw PurchaseVerificationException("구글이 빈 응답을 돌려줬습니다")
        } catch (e: HttpClientErrorException) {
            // 4xx — 토큰이 가짜거나(400/404), 이미 소비돼 사라졌거나(410), 우리 계정 권한이 모자라다(401/403).
            // 권한 문제는 운영이 알아야 하니 로그를 남기되, 유저에게는 똑같이 "확인 실패"다.
            if (e.statusCode.value() == 401 || e.statusCode.value() == 403) {
                log.error("Play Developer API 권한 오류 — 서비스 계정에 '재무 데이터 보기' 권한이 있는지 확인: {}", e.message)
            }
            throw PurchaseVerificationException("구글이 거래를 확인해 주지 않았습니다 (${e.statusCode.value()})")
        } catch (e: RestClientException) {
            throw PurchaseVerificationException("구글 결제 검증 호출 실패: ${e.message}")
        }

        return interpret(purchase, productId, purchaseToken)
    }

    /**
     * 구글 응답을 판정한다. HTTP와 분리해 둔 이유는 이 규칙이 테스트돼야 하기 때문이다 —
     * pending 결제에 잉크를 주면 취소돼도 잉크가 남는다.
     */
    fun interpret(purchase: ProductPurchase, requestedProductId: String, purchaseToken: String): VerifiedPurchase {
        when (purchase.purchaseState) {
            0 -> Unit
            1 -> throw PurchaseVerificationException("취소된 결제입니다")
            2 -> throw PurchaseVerificationException("아직 결제가 완료되지 않았습니다(pending)")
            else -> throw PurchaseVerificationException("알 수 없는 결제 상태: ${purchase.purchaseState}")
        }
        // 주문번호(GPA.xxxx)가 중복 지급을 막는 열쇠. 없으면(일부 테스트 결제) 토큰 자체를 쓴다 —
        // 토큰도 거래마다 유일하다.
        val transactionId = purchase.orderId?.takeIf { it.isNotBlank() } ?: purchaseToken
        return VerifiedPurchase(transactionId = transactionId, productId = purchase.productId ?: requestedProductId)
    }

    /** Play Developer API ProductPurchase — 필요한 필드만. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class ProductPurchase(
        /** 0 구매 완료, 1 취소, 2 보류(pending). */
        val purchaseState: Int? = null,
        /** 0 아직 소비 안 됨, 1 소비됨. */
        val consumptionState: Int? = null,
        val orderId: String? = null,
        val productId: String? = null,
        /** 0 테스트(라이선스 테스터), 1 프로모션, 2 리워드. 실결제는 필드가 없다. */
        val purchaseType: Int? = null,
    )

    companion object {
        private val log = LoggerFactory.getLogger(GooglePlayPurchaseVerifier::class.java)
        private const val ENDPOINT = "https://androidpublisher.googleapis.com/androidpublisher/v3"
        private const val SCOPE = "https://www.googleapis.com/auth/androidpublisher"
    }
}
