package com.prologue.backend.dailymeet.infrastructure.purchase

import io.jsonwebtoken.Jwts
import org.springframework.http.MediaType
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import tools.jackson.databind.ObjectMapper
import java.security.KeyFactory
import java.security.PrivateKey
import java.security.spec.PKCS8EncodedKeySpec
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.Date

/**
 * 서비스 계정 키(JSON)로 구글 API 액세스 토큰을 얻는다 — 서명한 JWT를 토큰 엔드포인트에 내고 바꿔 온다.
 *
 * google-auth-library를 들이지 않고 직접 하는 이유: 필요한 건 "JWT 하나 서명해서 토큰으로 바꾸기"뿐이고,
 * 서명은 이미 있는 jjwt가 한다. 라이브러리 하나가 끌고 오는 전이 의존성보다 이 60줄이 가볍다.
 *
 * 토큰은 만료 1분 전까지 재사용한다 — 결제 검증마다 토큰을 새로 받으면 구글 토큰 엔드포인트가 병목이 된다.
 */
class GoogleServiceAccountTokenProvider(
    serviceAccountJson: String,
    private val scope: String,
    restClientBuilder: RestClient.Builder,
    objectMapper: ObjectMapper,
) {
    private val client = restClientBuilder.build()
    private val clientEmail: String
    private val tokenUri: String
    private val privateKey: PrivateKey

    @Volatile
    private var cached: CachedToken? = null

    init {
        val json = objectMapper.readTree(serviceAccountJson)
        clientEmail = json["client_email"]?.asString()
            ?: throw IllegalArgumentException("서비스 계정 JSON에 client_email이 없습니다")
        tokenUri = json["token_uri"]?.asString() ?: DEFAULT_TOKEN_URI
        val pem = json["private_key"]?.asString()
            ?: throw IllegalArgumentException("서비스 계정 JSON에 private_key가 없습니다")
        privateKey = parsePrivateKey(pem)
    }

    fun accessToken(): String {
        cached?.let { if (it.expiresAt.isAfter(Instant.now().plus(REFRESH_MARGIN))) return it.token }
        return synchronized(this) {
            cached?.let { if (it.expiresAt.isAfter(Instant.now().plus(REFRESH_MARGIN))) return it.token }
            val fresh = exchange()
            cached = fresh
            fresh.token
        }
    }

    /** 서명된 assertion — 토큰 엔드포인트에 내는 JWT. 테스트가 서명과 클레임을 검사할 수 있게 따로 뗀다. */
    fun buildAssertion(now: Instant = Instant.now()): String =
        Jwts.builder()
            .issuer(clientEmail)
            .audience().add(tokenUri).and()
            .claim("scope", scope)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(ASSERTION_TTL)))
            .signWith(privateKey, Jwts.SIG.RS256)
            .compact()

    private fun exchange(): CachedToken {
        val form = LinkedMultiValueMap<String, String>().apply {
            add("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
            add("assertion", buildAssertion())
        }
        val response = client.post()
            .uri(tokenUri)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(form)
            .retrieve()
            .body(TokenResponse::class.java)
            ?: throw IllegalStateException("구글 토큰 엔드포인트가 빈 응답을 돌려줬습니다")
        return CachedToken(response.access_token, Instant.now().plusSeconds(response.expires_in))
    }

    private data class CachedToken(val token: String, val expiresAt: Instant)

    data class TokenResponse(val access_token: String, val expires_in: Long)

    companion object {
        private const val DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"
        private val ASSERTION_TTL: Duration = Duration.ofMinutes(60)
        private val REFRESH_MARGIN: Duration = Duration.ofMinutes(1)

        fun parsePrivateKey(pem: String): PrivateKey {
            val body = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("\\s".toRegex(), "")
            val der = Base64.getDecoder().decode(body)
            return KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(der))
        }
    }
}
