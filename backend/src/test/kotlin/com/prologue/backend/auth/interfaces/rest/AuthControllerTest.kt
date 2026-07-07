package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.port.AuthTokens
import com.prologue.backend.auth.application.service.EmailAlreadyRegisteredException
import com.prologue.backend.auth.application.service.EmailAuthService
import com.prologue.backend.auth.application.service.InvalidCredentialsException
import com.prologue.backend.auth.application.service.LoginResult
import com.prologue.backend.auth.domain.model.AccountId
import io.mockk.every
import io.mockk.mockk
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
    fun `가입 성공 시 201과 토큰, isNewUser true를 반환한다`() {
        val accountId = AccountId(UUID.randomUUID())
        every { emailAuthService.signup(any()) } returns
            LoginResult(accountId, AuthTokens("access-t", "refresh-t", 1800), isNewUser = true)

        mockMvc.post("/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com","password":"password123"}"""
        }.andExpect {
            status { isCreated() }
            jsonPath("$.accountId") { value(accountId.toString()) }
            jsonPath("$.accessToken") { value("access-t") }
            jsonPath("$.refreshToken") { value("refresh-t") }
            jsonPath("$.expiresIn") { value(1800) }
            jsonPath("$.isNewUser") { value(true) }
        }
    }

    @Test
    fun `로그인 성공 시 200과 토큰, isNewUser false를 반환한다`() {
        val accountId = AccountId(UUID.randomUUID())
        every { emailAuthService.login(any()) } returns
            LoginResult(accountId, AuthTokens("access-t", "refresh-t", 1800), isNewUser = false)

        mockMvc.post("/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com","password":"password123"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.isNewUser") { value(false) }
        }
    }

    @Test
    fun `이메일 형식이 잘못되면 400을 반환한다`() {
        mockMvc.post("/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"not-an-email","password":"password123"}"""
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value("INVALID_REQUEST") }
        }
    }

    @Test
    fun `짧은 비밀번호로 가입하면 400을 반환한다`() {
        mockMvc.post("/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com","password":"short"}"""
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `이미 가입된 이메일은 409를 반환한다`() {
        every { emailAuthService.signup(any()) } throws EmailAlreadyRegisteredException("user@example.com")

        mockMvc.post("/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com","password":"password123"}"""
        }.andExpect {
            status { isConflict() }
            jsonPath("$.code") { value("EMAIL_ALREADY_REGISTERED") }
        }
    }

    @Test
    fun `자격 불일치 로그인은 401을 반환한다`() {
        every { emailAuthService.login(any()) } throws InvalidCredentialsException()

        mockMvc.post("/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"user@example.com","password":"wrong-pw"}"""
        }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.code") { value("INVALID_CREDENTIALS") }
        }
    }
}
