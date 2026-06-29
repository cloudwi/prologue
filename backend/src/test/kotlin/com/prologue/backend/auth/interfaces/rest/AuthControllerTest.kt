package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.port.SocialVerificationException
import com.prologue.backend.auth.application.service.LoginResult
import com.prologue.backend.auth.application.service.SocialLoginService
import com.prologue.backend.auth.domain.model.AccountId
import io.mockk.every
import io.mockk.mockk
import java.util.UUID
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import kotlin.test.Test

class AuthControllerTest {

    private val socialLoginService = mockk<SocialLoginService>()
    private val mockMvc = MockMvcBuilders
        .standaloneSetup(AuthController(socialLoginService))
        .setControllerAdvice(AuthExceptionHandler())
        .build()

    @Test
    fun `카카오 로그인 성공 시 토큰과 isNewUser를 반환한다`() {
        val accountId = AccountId(UUID.randomUUID())
        every { socialLoginService.login(any()) } returns
            LoginResult(accountId, AuthTokens("access-t", "refresh-t", 1800), isNewUser = true)

        mockMvc.post("/auth/login/kakao") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"token":"raw-token"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.accountId") { value(accountId.toString()) }
            jsonPath("$.accessToken") { value("access-t") }
            jsonPath("$.refreshToken") { value("refresh-t") }
            jsonPath("$.expiresIn") { value(1800) }
            jsonPath("$.isNewUser") { value(true) }
        }
    }

    @Test
    fun `지원하지 않는 제공자는 400을 반환한다`() {
        mockMvc.post("/auth/login/unknown") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"token":"raw-token"}"""
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `소셜 토큰 검증 실패는 401을 반환한다`() {
        every { socialLoginService.login(any()) } throws SocialVerificationException("유효하지 않은 토큰")

        mockMvc.post("/auth/login/kakao") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"token":"bad"}"""
        }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.code") { value("INVALID_SOCIAL_TOKEN") }
        }
    }
}
