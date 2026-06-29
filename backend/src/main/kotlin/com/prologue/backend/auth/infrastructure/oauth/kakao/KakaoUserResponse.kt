package com.prologue.backend.auth.infrastructure.oauth.kakao

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

/**
 * 카카오 `/v2/user/me` 응답 (필요한 필드만).
 * https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api#req-user-info
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class KakaoUserResponse(
    val id: Long,
    @param:JsonProperty("kakao_account") val kakaoAccount: KakaoAccount? = null,
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class KakaoAccount(
        val email: String? = null,
        val profile: Profile? = null,
    )

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class Profile(
        val nickname: String? = null,
    )
}
