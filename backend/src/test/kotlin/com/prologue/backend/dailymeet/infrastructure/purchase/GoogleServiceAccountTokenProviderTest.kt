package com.prologue.backend.dailymeet.infrastructure.purchase

import io.jsonwebtoken.Jwts
import org.springframework.web.client.RestClient
import tools.jackson.databind.json.JsonMapper
import java.security.KeyPairGenerator
import java.time.Instant
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals

class GoogleServiceAccountTokenProviderTest {

    @Test
    fun `서비스 계정 키로 서명한 assertion은 그 키의 공개키로 검증되고 클레임이 맞다`() {
        val pair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        val pem = "-----BEGIN PRIVATE KEY-----\n" +
            Base64.getMimeEncoder(64, "\n".toByteArray()).encodeToString(pair.private.encoded) +
            "\n-----END PRIVATE KEY-----\n"
        val json = JsonMapper.builder().build().writeValueAsString(
            mapOf(
                "client_email" to "svc@prologue-2e777.iam.gserviceaccount.com",
                "private_key" to pem,
                "token_uri" to "https://oauth2.googleapis.com/token",
            ),
        )
        val provider = GoogleServiceAccountTokenProvider(
            json, "https://www.googleapis.com/auth/androidpublisher", RestClient.builder(), JsonMapper.builder().build(),
        )

        val now = Instant.now().let { Instant.ofEpochSecond(it.epochSecond) }
        val assertion = provider.buildAssertion(now)
        val claims = Jwts.parser().verifyWith(pair.public).build().parseSignedClaims(assertion).payload

        assertEquals("svc@prologue-2e777.iam.gserviceaccount.com", claims.issuer)
        assertEquals(setOf("https://oauth2.googleapis.com/token"), claims.audience)
        assertEquals("https://www.googleapis.com/auth/androidpublisher", claims["scope"])
        assertEquals(now.epochSecond, claims.issuedAt.toInstant().epochSecond)
        assertEquals(now.plusSeconds(3600).epochSecond, claims.expiration.toInstant().epochSecond)
    }
}
