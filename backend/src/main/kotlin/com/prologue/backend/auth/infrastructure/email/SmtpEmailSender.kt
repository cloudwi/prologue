package com.prologue.backend.auth.infrastructure.email

import com.prologue.backend.auth.application.port.EmailSender
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Primary
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Component

/**
 * SMTP(Gmail 등) 기반 실제 이메일 발송 구현.
 *
 * `spring.mail.username`이 설정된 경우에만 활성화되며([@ConditionalOnProperty]),
 * [@Primary]로 개발용 [LoggingEmailSender]보다 우선한다. 미설정 시 stub이 사용된다.
 *
 * 한글 제목/발신자명이 있으므로 [MimeMessageHelper]로 UTF-8 인코딩을 명시한다.
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
        val mime = mailSender.createMimeMessage()
        val helper = MimeMessageHelper(mime, false, "UTF-8")
        helper.setFrom(from, "프롤로그") // 발신자명은 UTF-8로 인코딩됨
        helper.setTo(email)
        helper.setSubject("[프롤로그] 인증코드 $code")
        helper.setText(
            buildString {
                appendLine("프롤로그 인증코드입니다.")
                appendLine()
                appendLine("    $code")
                appendLine()
                appendLine("5분 안에 앱에 입력해 주세요.")
                appendLine("본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.")
            },
        )
        mailSender.send(mime)
    }
}
