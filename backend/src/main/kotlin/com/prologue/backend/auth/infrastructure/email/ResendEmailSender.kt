package com.prologue.backend.auth.infrastructure.email

import com.prologue.backend.auth.application.port.EmailSendException
import com.prologue.backend.auth.application.port.EmailSender
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Primary
import org.springframework.core.io.ClassPathResource
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientResponseException

/**
 * Resend HTTP API 기반 이메일 발송.
 *
 * Render가 아웃바운드 SMTP 포트(25/465/587)를 막기 때문에 SMTP 대신 HTTPS(443) API로 발송한다.
 * `RESEND_API_KEY`가 설정된 경우에만 활성화되며([@ConditionalOnProperty]), [@Primary]로 dev stub보다 우선.
 *
 * 발신주소(resend.from): 도메인 인증 전엔 `onboarding@resend.dev`만 사용 가능하고,
 * 이 경우 Resend 계정 소유 이메일로만 발송된다. 도메인 인증 후 `noreply@내도메인`으로 교체.
 */
@Component
@Primary
@ConditionalOnProperty(prefix = "resend", name = ["api-key"])
class ResendEmailSender(
    @param:Value("\${resend.api-key}") private val apiKey: String,
    @param:Value("\${resend.from}") private val from: String,
    @param:Value("\${web.base-url}") private val webBaseUrl: String,
    restClientBuilder: RestClient.Builder,
) : EmailSender {

    private val client = restClientBuilder.baseUrl("https://api.resend.com").build()

    private val htmlTemplate =
        ClassPathResource("email/verification-code.html").inputStream.use { it.readBytes().toString(Charsets.UTF_8) }

    override fun sendVerificationCode(email: String, code: String) {
        val authUrl = "${webBaseUrl.trimEnd('/')}/auth?code=$code"
        val payload = mapOf(
            "from" to from,
            "to" to listOf(email),
            "subject" to "[프롤로그] 이메일 인증번호 $code",
            "html" to htmlTemplate.replace("{{code}}", code).replace("{{authUrl}}", authUrl),
            // HTML 미지원 클라이언트용 폴백
            "text" to buildString {
                appendLine("인증번호는 $code 입니다.")
                appendLine()
                appendLine("프롤로그 앱의 인증번호 입력 화면에서 위 번호를 입력해주세요.")
                appendLine("5분이 지나면 만료돼요.")
                appendLine()
                appendLine("휴대폰에서 보고 계신가요? 아래 주소로 앱을 열면 바로 입력돼요.")
                appendLine("    $authUrl")
                appendLine()
                appendLine("본인이 요청하지 않았다면 이 메일을 무시하셔도 괜찮아요.")
                appendLine("※ 본 메일은 발신 전용이라 회신 내용을 확인할 수 없어요.")
            },
        )
        try {
            client.post()
                .uri("/emails")
                .header("Authorization", "Bearer $apiKey")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity()
        } catch (e: RestClientResponseException) {
            // Resend가 4xx/5xx로 응답한 경우 본문에 원인이 담겨 있다(도메인 미인증/수신자 제한 등).
            throw EmailSendException("Resend ${e.statusCode.value()}: ${e.responseBodyAsString}", e)
        }
    }
}
