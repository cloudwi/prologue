package com.prologue.backend.auth.infrastructure.oauth.kakao

import com.prologue.backend.auth.application.port.SocialUserInfo
import com.prologue.backend.auth.application.port.SocialVerificationException
import com.prologue.backend.auth.domain.model.SocialProvider
import com.prologue.backend.auth.infrastructure.oauth.SocialClient
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/**
 * 카카오 액세스 토큰을 `/v2/user/me`로 검증하고 사용자 정보를 추출한다.
 */
@Component
class KakaoSocialClient(builder: RestClient.Builder) : SocialClient {

    private val restClient: RestClient = builder.baseUrl(KAKAO_API_BASE).build()

    override val provider: SocialProvider = SocialProvider.KAKAO

    override fun fetchUser(accessToken: String): SocialUserInfo {
        val response = restClient.get()
            .uri("/v2/user/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $accessToken")
            .retrieve()
            .onStatus({ it.is4xxClientError }) { _, res ->
                throw SocialVerificationException("카카오 토큰 검증 실패 (status=${res.statusCode})")
            }
            .body(KakaoUserResponse::class.java)
            ?: throw SocialVerificationException("카카오 사용자 응답이 비어 있습니다")

        return SocialUserInfo(
            provider = SocialProvider.KAKAO,
            providerUserId = response.id.toString(),
            email = response.kakaoAccount?.email,
            nickname = response.kakaoAccount?.profile?.nickname,
        )
    }

    companion object {
        private const val KAKAO_API_BASE = "https://kapi.kakao.com"
    }
}
