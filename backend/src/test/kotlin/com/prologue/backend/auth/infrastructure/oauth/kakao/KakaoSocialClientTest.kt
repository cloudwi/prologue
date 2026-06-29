package com.prologue.backend.auth.infrastructure.oauth.kakao

import com.prologue.backend.auth.application.port.SocialVerificationException
import com.prologue.backend.auth.domain.model.SocialProvider
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest
import org.springframework.web.client.RestClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class KakaoSocialClientTest {

    private val builder = RestClient.builder()
    private val server: MockRestServiceServer = MockRestServiceServer.bindTo(builder).build()
    private val client = KakaoSocialClient(builder)

    @Test
    fun `카카오 응답을 SocialUserInfo로 변환한다`() {
        server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
            .andExpect(header("Authorization", "Bearer token-123"))
            .andRespond(
                withSuccess(
                    """{"id":123456789,"kakao_account":{"email":"a@b.com","profile":{"nickname":"테스터"}}}""",
                    MediaType.APPLICATION_JSON,
                ),
            )

        val info = client.fetchUser("token-123")

        assertEquals(SocialProvider.KAKAO, info.provider)
        assertEquals("123456789", info.providerUserId)
        assertEquals("a@b.com", info.email)
        assertEquals("테스터", info.nickname)
        server.verify()
    }

    @Test
    fun `이메일 동의가 없으면 email은 null이어도 변환된다`() {
        server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
            .andRespond(
                withSuccess("""{"id":987654321,"kakao_account":{}}""", MediaType.APPLICATION_JSON),
            )

        val info = client.fetchUser("token-abc")

        assertEquals("987654321", info.providerUserId)
        assertEquals(null, info.email)
    }

    @Test
    fun `유효하지 않은 토큰(401)은 SocialVerificationException`() {
        server.expect(requestTo("https://kapi.kakao.com/v2/user/me"))
            .andRespond(withUnauthorizedRequest())

        assertFailsWith<SocialVerificationException> { client.fetchUser("bad-token") }
    }
}
