package com.prologue.backend.auth.infrastructure.email

import com.prologue.backend.auth.application.port.EmailSender
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Primary
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Component

/**
 * SMTP(Gmail 등) 기반 실제 이메일 발송 구현.
 *
 * `spring.mail.username`이 설정된 경우에만 활성화되며([@ConditionalOnProperty]),
 * [@Primary]로 개발용 [LoggingEmailSender]보다 우선한다. 미설정 시 stub이 사용된다.
 *
 * 환경변수: SPRING_MAIL_USERNAME(gmail 주소), SPRING_MAIL_PASSWORD(앱 비밀번호).
 */
@Component
@Primary
@ConditionalOnProperty(prefix = "spring.mail", name = ["username"])
class SmtpEmailSender(
    private val mailSender: JavaMailSender,
    @param:Value("\${spring.mail.username}") private val from: String,
) : EmailSender {

    override fun sendVerificationCode(email: String, code: String) {
        val message = SimpleMailMessage().apply {
            setFrom("프롤로그 <$from>")
            setTo(email)
            subject = "[프롤로그] 인증코드 $code"
            text = buildString {
                appendLine("프롤로그 인증코드입니다.")
                appendLine()
                appendLine("    $code")
                appendLine()
                appendLine("5분 안에 앱에 입력해 주세요.")
                appendLine("본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.")
            }
        }
        mailSender.send(message)
    }
}
