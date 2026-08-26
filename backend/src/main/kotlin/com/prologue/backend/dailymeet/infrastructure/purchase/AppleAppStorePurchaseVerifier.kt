package com.prologue.backend.dailymeet.infrastructure.purchase

import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
import com.prologue.backend.dailymeet.application.port.VerifiedPurchase
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper
import java.math.BigInteger
import java.security.GeneralSecurityException
import java.security.Signature
import java.security.cert.CertPathValidator
import java.security.cert.CertificateFactory
import java.security.cert.PKIXParameters
import java.security.cert.TrustAnchor
import java.security.cert.X509Certificate
import java.util.Base64

/**
 * iOS 결제 확인 — StoreKit 2가 준 서명된 거래(JWS)를 우리 손에서 검증한다.
 *
 * 안드로이드와 달리 애플에는 되물을 필요가 없다. 앱이 보내오는 `purchaseToken`이 곧
 * StoreKit 2의 `jwsRepresentation`이고, 그 안에 애플이 서명한 거래 내용과 서명에 쓴
 * 인증서 사슬(x5c)이 통째로 들어 있다. 사슬의 뿌리가 우리가 심어둔 Apple Root CA - G3와
 * 맞고 서명이 맞으면, 그 내용은 애플이 말한 것이다.
 *
 * 그래서 App Store Server API 키를 따로 발급받지 않는다 — 키가 없으면 검증도 없는 구조보다,
 * 키 없이도 늘 검증되는 구조가 낫다. (환불 회수처럼 애플에게 물어야만 아는 일이 생기면
 * 그때 App Store Server Notifications를 붙인다.)
 *
 * 검증은 네 겹이다. 하나라도 어긋나면 거절한다 — 잉크는 돈이다.
 *  1. 사슬이 Apple Root CA - G3까지 이어지는가 (뿌리는 리소스에 고정, 사슬은 JWS가 들고 온다)
 *  2. 잎 인증서가 애플의 **결제 서명용** 인증서인가 ([LEAF_OID]) — 애플이 발급한 아무 인증서나 통과하면 안 된다
 *  3. 서명이 그 잎 인증서의 키로 만들어졌는가 (ES256)
 *  4. 내용이 우리 앱의, 우리가 지급하려는 상품의, 취소되지 않은 거래인가
 */
@Component
class AppleAppStorePurchaseVerifier(
    @param:Value("\${store.apple.bundle-id}") private val bundleId: String,
    @param:Value("\${store.apple.allow-sandbox:true}") private val allowSandbox: Boolean,
    private val objectMapper: ObjectMapper,
) {
    /** 신뢰의 뿌리. 여기 없는 사슬은 애플의 것이 아니다. */
    private val rootCa: X509Certificate by lazy {
        ClassPathResource(ROOT_CA_RESOURCE).inputStream.use {
            CertificateFactory.getInstance("X.509").generateCertificate(it) as X509Certificate
        }
    }

    fun verify(productId: String, jws: String): VerifiedPurchase =
        try {
            check(productId, jws)
        } catch (e: PurchaseVerificationException) {
            // 유저에게는 "결제를 확인하지 못했어요" 한 줄만 간다(InkPurchaseService). 그건 맞다 —
            // 인증서 사슬 얘기를 해봐야 할 수 있는 일이 없다. 대신 운영은 이유를 알아야 한다.
            // 이 줄이 없으면 거절이 로그에 흔적을 남기지 않아, 돈은 나가고 잉크가 안 들어오는데
            // 왜인지 아무도 모르는 상태가 된다.
            log.warn("애플 결제 검증 거절 — productId={}, 이유={}", productId, e.message)
            throw e
        }

    private fun check(productId: String, jws: String): VerifiedPurchase {
        val parts = jws.split('.')
        if (parts.size != 3) throw PurchaseVerificationException("애플 거래 증표의 형식이 아닙니다")
        val (encodedHeader, encodedPayload, encodedSignature) = parts

        val header = decodeJson(encodedHeader, "헤더")
        if (header["alg"]?.toString() != "ES256") {
            throw PurchaseVerificationException("애플 거래 증표의 서명 방식이 예상과 다릅니다: ${header["alg"]}")
        }

        val chain = certificateChain(header)
        verifyChain(chain)
        verifySignature(chain.first(), "$encodedHeader.$encodedPayload", encodedSignature)

        return interpret(decodeJson(encodedPayload, "내용"), productId)
    }

    /**
     * 서명이 확인된 거래 내용을 판정한다.
     *
     * 서명 검증과 떼어 둔 이유는 이 규칙이 테스트돼야 하기 때문이다. 애플의 진짜 서명은
     * 테스트에서 만들 수 없지만, "취소된 거래에 잉크를 주지 않는다" 같은 규칙은 반드시 검증돼야 한다.
     */
    fun interpret(payload: Map<String, Any?>, requestedProductId: String): VerifiedPurchase {
        val transactionId = payload["transactionId"]?.toString()?.takeIf { it.isNotBlank() }
            ?: throw PurchaseVerificationException("애플 거래에 거래번호가 없습니다")

        // 다른 앱에서 만든 거래를 우리 앱의 결제로 들이밀 수 없게 한다.
        val payloadBundleId = payload["bundleId"]?.toString()
        if (payloadBundleId != bundleId) {
            throw PurchaseVerificationException("다른 앱의 거래입니다 ($payloadBundleId)")
        }

        // 싼 상품을 사고 비싼 상품 id를 보내는 시도. InkPurchaseService도 한 번 더 보지만,
        // 스토어의 답과 요청이 어긋난다는 사실 자체를 여기서 먼저 끊는다.
        val payloadProductId = payload["productId"]?.toString()
            ?: throw PurchaseVerificationException("애플 거래에 상품이 없습니다")
        if (payloadProductId != requestedProductId) {
            throw PurchaseVerificationException("결제 내역이 상품과 맞지 않습니다")
        }

        // 환불·취소된 거래. 시간이 지나 되돌려진 거래가 재시도로 다시 들어올 수 있다.
        if (payload["revocationDate"] != null) throw PurchaseVerificationException("취소된 결제입니다")

        // 잉크는 소모성 상품이다. 구독이나 비소모성이 섞여 들어오면 지급 규칙이 달라진다.
        val type = payload["type"]?.toString()
        if (type != null && type != CONSUMABLE) {
            throw PurchaseVerificationException("소모성 상품이 아닙니다 ($type)")
        }

        // 샌드박스 거래도 애플이 진짜로 서명한다. 심사관은 샌드박스로 결제하므로 기본은 허용이지만,
        // 샌드박스 테스터 계정을 가진 사람은 누구나 공짜로 잉크를 만들 수 있다는 뜻이기도 하다.
        // 매출이 의미를 갖기 시작하면 APPLE_ALLOW_SANDBOX=false로 닫는다.
        val environment = payload["environment"]?.toString()
        if (environment == SANDBOX) {
            if (!allowSandbox) throw PurchaseVerificationException("샌드박스 결제는 받지 않습니다")
            log.info("샌드박스 결제를 지급합니다 — transactionId={}, productId={}", transactionId, payloadProductId)
        }

        log.info(
            "애플 결제 검증 통과 — transactionId={}, productId={}, environment={}",
            transactionId,
            payloadProductId,
            environment ?: "(없음)",
        )
        return VerifiedPurchase(transactionId = transactionId, productId = payloadProductId)
    }

    /** JWS 헤더의 x5c — [잎, 중간, 뿌리] 차례의 인증서들. 표준 base64(URL-safe 아님)다. */
    private fun certificateChain(header: Map<String, Any?>): List<X509Certificate> {
        val x5c = header["x5c"] as? List<*>
            ?: throw PurchaseVerificationException("애플 거래 증표에 인증서 사슬이 없습니다")
        val factory = CertificateFactory.getInstance("X.509")
        return x5c.map { entry ->
            // base64가 아니거나 X.509가 아닌 바이트가 올 수 있다. 앱이 보낸 값이라 어떤 모양이든 올 수 있고,
            // 그때도 500이 아니라 "확인 실패"로 떨어져야 한다 — InkPurchaseService가 잡는 예외는 이것 하나다.
            try {
                val der = Base64.getDecoder().decode(entry.toString())
                factory.generateCertificate(der.inputStream()) as X509Certificate
            } catch (e: IllegalArgumentException) {
                throw PurchaseVerificationException("인증서가 base64가 아닙니다: ${e.message}")
            } catch (e: GeneralSecurityException) {
                throw PurchaseVerificationException("인증서를 읽지 못했습니다: ${e.message}")
            }
        }
    }

    /**
     * 사슬이 우리가 심어둔 애플 뿌리까지 이어지는지 확인한다.
     *
     * 신뢰 앵커는 JWS가 들고 온 마지막 인증서가 아니라 리소스의 [rootCa]다 — 사슬 안의 뿌리를
     * 믿으면 아무나 자기 뿌리로 서명한 사슬을 만들어 통과할 수 있다.
     * 폐기 확인(OCSP/CRL)은 끄고 간다. 애플의 응답기가 잠깐 흔들릴 때마다 결제가 막히는 쪽이
     * 더 큰 손해이고, 잎 인증서의 유효기간과 사슬만으로도 위조는 막힌다.
     */
    private fun verifyChain(chain: List<X509Certificate>) {
        if (chain.size < 2) throw PurchaseVerificationException("인증서 사슬이 너무 짧습니다 (${chain.size})")

        val leaf = chain.first()
        if (leaf.getExtensionValue(LEAF_OID) == null) {
            throw PurchaseVerificationException("결제 서명용 인증서가 아닙니다 ($LEAF_OID 없음)")
        }

        try {
            // 앵커(뿌리)는 경로에 넣지 않는다 — PKIX는 앵커를 뺀 나머지를 경로로 받는다.
            val path = CertificateFactory.getInstance("X.509").generateCertPath(chain.dropLast(1))
            val params = PKIXParameters(setOf(TrustAnchor(rootCa, null))).apply { isRevocationEnabled = false }
            CertPathValidator.getInstance("PKIX").validate(path, params)
        } catch (e: GeneralSecurityException) {
            throw PurchaseVerificationException("애플 인증서 사슬을 확인하지 못했습니다: ${e.message}")
        }
    }

    /** ES256 서명 확인. JOSE는 r‖s 64바이트로 주고 자바는 DER을 원해서, 사이에서 옮겨 준다. */
    private fun verifySignature(leaf: X509Certificate, signingInput: String, encodedSignature: String) {
        val jose = base64Url(encodedSignature, "서명")
        if (jose.size != 64) throw PurchaseVerificationException("서명 길이가 ES256이 아닙니다 (${jose.size})")

        val valid = try {
            Signature.getInstance("SHA256withECDSA").run {
                initVerify(leaf.publicKey)
                update(signingInput.toByteArray(Charsets.US_ASCII))
                verify(joseToDer(jose))
            }
        } catch (e: GeneralSecurityException) {
            throw PurchaseVerificationException("서명을 확인하지 못했습니다: ${e.message}")
        }
        if (!valid) throw PurchaseVerificationException("애플의 서명이 아닙니다")
    }

    private fun decodeJson(encoded: String, what: String): Map<String, Any?> =
        try {
            @Suppress("UNCHECKED_CAST")
            objectMapper.readValue(base64Url(encoded, what), Map::class.java) as Map<String, Any?>
        } catch (e: Exception) {
            throw PurchaseVerificationException("애플 거래 증표의 ${what}을 읽지 못했습니다")
        }

    private fun base64Url(encoded: String, what: String): ByteArray =
        try {
            Base64.getUrlDecoder().decode(encoded)
        } catch (e: IllegalArgumentException) {
            throw PurchaseVerificationException("애플 거래 증표의 ${what}이 base64가 아닙니다")
        }

    companion object {
        private val log = LoggerFactory.getLogger(AppleAppStorePurchaseVerifier::class.java)

        private const val ROOT_CA_RESOURCE = "apple/AppleRootCA-G3.cer"

        /**
         * 애플이 결제 서명용 잎 인증서에만 넣는 확장 OID.
         * 이게 없으면 "애플이 발급한 인증서"일 뿐 "애플이 결제에 쓰는 인증서"는 아니다.
         */
        private const val LEAF_OID = "1.2.840.113635.100.6.11.1"

        private const val CONSUMABLE = "Consumable"
        private const val SANDBOX = "Sandbox"

        /** r‖s(각 32바이트) → DER SEQUENCE { INTEGER r, INTEGER s }. */
        internal fun joseToDer(jose: ByteArray): ByteArray {
            val r = BigInteger(1, jose.copyOfRange(0, 32)).toByteArray()
            val s = BigInteger(1, jose.copyOfRange(32, 64)).toByteArray()
            val body = ByteArray(2 + r.size + 2 + s.size)
            var i = 0
            body[i++] = 0x02; body[i++] = r.size.toByte()
            r.copyInto(body, i); i += r.size
            body[i++] = 0x02; body[i++] = s.size.toByte()
            s.copyInto(body, i)
            return byteArrayOf(0x30, body.size.toByte()) + body
        }
    }
}