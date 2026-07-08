package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.service.EmailAuthService
import com.prologue.backend.auth.application.service.InvalidVerificationCodeException
import com.prologue.backend.auth.application.service.LoginResult
import com.prologue.backend.auth.application.service.TooManyRequestsException
import com.prologue.backend.auth.domain.model.AccountId
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import java.util.UUID
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import kotlin.test.Test

class AuthControllerTest {

    private val emailAuthService = mockk<EmailAuthService>()
    private val mockMvc = MockMvcBuilders
        .standaloneSetup(AuthController(emailAuthService))
        .setControllerAdvice(AuthExceptionHandler())
        .build()

    @Test
    fun `코드 요청 성공 시 200과 만료시간을 반환한다`() {
        every { emailAuthService.requestCode(any()) } just runs

        mockMvc.post("/auth/email/request-code") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.expiresInSeconds") { value(300) }
        }
    }

    @Test
    fun `잘못된 이메일 형식은 400`() {
        mockMvc.post("/auth/email/request-code") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"not-an-email"}"""
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("INVALID_REQUEST") }
        }
    }

    @Test
    fun `재발송 간격 위반은 429`() {
        every { emailAuthService.requestCode(any()) } throws TooManyRequestsException("잠시 후 다시")

        mockMvc.post("/auth/email/request-code") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com"}"""
        }.andExpect {
            status { isTooManyRequests() }
            jsonPath("$.code") { value("TOO_MANY_REQUESTS") }
        }
    }

    @Test
    fun `코드 검증 성공 시 200과 토큰을 반환한다`() {
        val accountId = AccountId(UUID.randomUUID())
        every { emailAuthService.verify(any()) } returns
            LoginResult(accountId, AuthTokens("access-t", "refresh-t", 1800), isNewUser = true)

        mockMvc.post("/auth/email/verify") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com","code":"042917"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.accessToken") { value("access-t") }
            jsonPath("$.isNewUser") { value(true) }
        }
    }

    @Test
    fun `6자리가 아닌 코드는 400`() {
        mockMvc.post("/auth/email/verify") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com","code":"12"}"""
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `틀린 코드 검증은 401`() {
        every { emailAuthService.verify(any()) } throws InvalidVerificationCodeException()

        mockMvc.post("/auth/email/verify") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com","code":"000000"}"""
        }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.code") { value("INVALID_CODE") }
        }
    }
}
