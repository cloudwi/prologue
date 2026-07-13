package com.prologue.backend.auth.infrastructure.email

import com.prologue.backend.auth.application.port.EmailSendException
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.not
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import kotlin.test.Test
import kotlin.test.assertFailsWith

class ResendEmailSenderTest {

    private val builder = RestClient.builder()
    private val server = MockRestServiceServer.bindTo(builder).build()
    private val sender = ResendEmailSender("test-key", "프롤로그 <onboarding@resend.dev>", builder)

    @Test
    fun `HTML 템플릿에 코드를 치환해 발송한다`() {
        server.expect(requestTo("https://api.resend.com/emails"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer test-key"))
            .andExpect(jsonPath("$.subject", containsString("233670")))
            .andExpect(jsonPath("$.html", containsString("233670")))
            .andExpect(jsonPath("$.html", not(containsString("{{code}}"))))
            .andExpect(jsonPath("$.text", containsString("233670")))
            .andRespond(withSuccess("""{"id":"1"}""", MediaType.APPLICATION_JSON))

        sender.sendVerificationCode("user@example.com", "233670")

        server.verify()
    }

    @Test
    fun `Resend가 오류로 응답하면 EmailSendException`() {
        server.expect(requestTo("https://api.resend.com/emails"))
            .andRespond(withStatus(HttpStatus.FORBIDDEN).body("""{"message":"domain not verified"}"""))

        assertFailsWith<EmailSendException> {
            sender.sendVerificationCode("user@example.com", "233670")
        }
    }
}
