package com.prologue.backend.dailymeet.infrastructure.purchase

import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
import tools.jackson.databind.json.JsonMapper
import java.math.BigInteger
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * 애플의 진짜 서명은 테스트에서 만들 수 없다 — 애플의 개인키가 있어야 하기 때문이다.
 * 그래서 두 갈래로 나눠 검증한다.
 *  - [interpret]: 서명이 이미 확인된 뒤의 판정 규칙. 취소·다른 앱·다른 상품·샌드박스.
 *  - [verify]: 애플이 서명하지 않은 증표는 어떤 모양이든 통과하지 못한다는 것.
 */
class AppleAppStorePurchaseVerifierTest {

    private fun verifier(bundleId: String = BUNDLE_ID, allowSandbox: Boolean = true) =
        AppleAppStorePurchaseVerifier(bundleId, allowSandbox, JsonMapper.builder().build())

    private fun payload(
        transactionId: String = "2000000900112233",
        bundleId: String = BUNDLE_ID,
        productId: String = "ink50",
        type: String? = "Consumable",
        environment: String? = "Production",
        revocationDate: Long? = null,
    ) = buildMap<String, Any?> {
        put("transactionId", transactionId)
        put("bundleId", bundleId)
        put("productId", productId)
        type?.let { put("type", it) }
        environment?.let { put("environment", it) }
        revocationDate?.let { put("revocationDate", it) }
    }

    @Test
    fun `정상 거래는 거래번호와 상품을 그대로 돌려준다`() {
        val result = verifier().interpret(payload(), "ink50")
        assertEquals("2000000900112233", result.transactionId)
        assertEquals("ink50", result.productId)
    }

    @Test
    fun `다른 앱의 거래는 거절한다`() {
        val e = assertFailsWith<PurchaseVerificationException> {
            verifier().interpret(payload(bundleId = "com.someone.else"), "ink50")
        }
        assertContains(e.message!!, "다른 앱")
    }

    @Test
    fun `싼 상품을 사고 비싼 상품을 달라는 요청은 거절한다`() {
        assertFailsWith<PurchaseVerificationException> {
            verifier().interpret(payload(productId = "ink50"), "ink250")
        }
    }

    @Test
    fun `환불된 거래에는 잉크를 주지 않는다`() {
        val e = assertFailsWith<PurchaseVerificationException> {
            verifier().interpret(payload(revocationDate = 1_756_000_000_000), "ink50")
        }
        assertContains(e.message!!, "취소된")
    }

    @Test
    fun `소모성이 아닌 상품은 거절한다`() {
        assertFailsWith<PurchaseVerificationException> {
            verifier().interpret(payload(type = "Auto-Renewable Subscription"), "ink50")
        }
    }

    @Test
    fun `샌드박스 거래는 기본으로 허용된다 - 심사관이 샌드박스로 결제한다`() {
        val result = verifier().interpret(payload(environment = "Sandbox"), "ink50")
        assertEquals("2000000900112233", result.transactionId)
    }

    @Test
    fun `샌드박스를 닫으면 샌드박스 거래는 거절한다`() {
        val e = assertFailsWith<PurchaseVerificationException> {
            verifier(allowSandbox = false).interpret(payload(environment = "Sandbox"), "ink50")
        }
        assertContains(e.message!!, "샌드박스")
    }

    @Test
    fun `거래번호가 없으면 거절한다 - 중복 지급을 막을 열쇠가 없다`() {
        assertFailsWith<PurchaseVerificationException> {
            verifier().interpret(payload().minus("transactionId"), "ink50")
        }
    }

    @Test
    fun `JWS 모양이 아니면 거절한다`() {
        assertFailsWith<PurchaseVerificationException> { verifier().verify("ink50", "그냥-문자열") }
    }

    @Test
    fun `인증서 사슬이 없으면 거절한다`() {
        val jws = jws(header = mapOf("alg" to "ES256"), payloadJson = "{}")
        val e = assertFailsWith<PurchaseVerificationException> { verifier().verify("ink50", jws) }
        assertContains(e.message!!, "인증서 사슬")
    }

    @Test
    fun `X509이 아닌 바이트를 인증서라고 보내도 500이 아니라 검증 실패다`() {
        val jws = jws(mapOf("alg" to "ES256", "x5c" to listOf("bm90LWEtY2VydA==")), "{}")
        val e = assertFailsWith<PurchaseVerificationException> { verifier().verify("ink50", jws) }
        assertContains(e.message!!, "인증서")
    }

    @Test
    fun `애플이 아닌 뿌리로 이어지는 사슬은 거절한다 - 여기가 뚫리면 누구나 잉크를 찍는다`() {
        // 결제 서명용 OID까지 갖췄지만 우리가 심어둔 Apple Root CA - G3에서 나오지 않은 인증서다.
        val jws = jws(mapOf("alg" to "ES256", "x5c" to listOf(NOT_APPLE_CERT, NOT_APPLE_CERT)), "{}")
        val e = assertFailsWith<PurchaseVerificationException> { verifier().verify("ink50", jws) }
        assertContains(e.message!!, "사슬")
    }

    @Test
    fun `JOSE 서명을 DER로 옮긴다 - 자바 검증기가 읽는 모양`() {
        val jose = ByteArray(64) { 0x01 }
        val der = AppleAppStorePurchaseVerifier.joseToDer(jose)
        assertEquals(0x30, der[0].toInt())               // SEQUENCE
        assertEquals(0x02, der[2].toInt())               // INTEGER r
        assertEquals(der.size - 2, der[1].toInt())       // 길이가 본문과 맞는다
        // 값이 살아 있어야 한다 — r과 s가 같은 32바이트였으니 둘 다 같은 정수로 돌아온다
        val expected = BigInteger(1, ByteArray(32) { 0x01 })
        assertEquals(expected, BigInteger(1, der.copyOfRange(4, 4 + der[3].toInt())))
    }

    private fun jws(header: Map<String, Any?>, payloadJson: String): String {
        val mapper = JsonMapper.builder().build()
        val encoder = Base64.getUrlEncoder().withoutPadding()
        val h = encoder.encodeToString(mapper.writeValueAsString(header).toByteArray())
        val p = encoder.encodeToString(payloadJson.toByteArray())
        return "$h.$p.${encoder.encodeToString(ByteArray(64))}"
    }

    companion object {
        private const val BUNDLE_ID = "day.prologue.app"

        /**
         * 진짜 X.509이고 애플의 결제 서명용 OID(1.2.840.113635.100.6.11.1)까지 달았지만,
         * 애플이 발급한 것이 아닌 자체 서명 인증서. 뿌리 고정이 살아 있는지 보는 데 쓴다.
         */
        private const val NOT_APPLE_CERT =
            "MIIBpTCCAUygAwIBAgIUAhJWgUR50S5ZUPSFeKZrpTK2DCcwCgYIKoZIzj0EAwIwMDESMBAGA1UEAwwJTm90IEFwcGxlMQ0wCwYDVQQKDARUZXN0MQswCQYDVQQGEwJLUjAeFw0yNjA4MjYwMTQ2NTZaFw0zNjA4MjMwMTQ2NTZaMDAxEjAQBgNVBAMMCU5vdCBBcHBsZTENMAsGA1UECgwEVGVzdDELMAkGA1UEBhMCS1IwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQ8RGuX4r8fu/KJv9xyWGcDvKLu1lKfrpXQ8Jd/i/EV2I+1qhp6bENwZU+XMEwdNyDtodG1wfTniPWXC9epx0Ijo0QwQjAPBgNVHRMBAf8EBTADAQH/MBAGCiqGSIb3Y2QGCwEEAgUAMB0GA1UdDgQWBBT6uT/2Ny+4PKcnAN0E9pf8h/PsEjAKBggqhkjOPQQDAgNHADBEAiAuynt6JMigpLwOFQPK/5XdsM4piqaVCglq+c/bef6JUAIgS1e199X82hCUIPrj6O35f7Nq02FbWJv682Y61RgUMls="
    }
}
