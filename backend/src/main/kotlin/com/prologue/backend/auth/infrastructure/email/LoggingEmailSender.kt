package com.prologue.backend.auth.infrastructure.email

import com.prologue.backend.auth.application.port.EmailSender
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

/**
 * 개발용 이메일 발송 stub — 실제로 보내지 않고 서버 로그에 코드를 출력한다.
 *
 * 실제 발송 제공자(Resend/SES 등) 어댑터를 추가하면 @Primary 등으로 교체한다.
 * 운영 배포 전 반드시 실제 발송 구현으로 대체할 것.
 */
@Component
class LoggingEmailSender : EmailSender {
    override fun sendVerificationCode(email: String, code: String) {
        log.warn("[DEV 이메일 발송 stub] to={} 인증코드={} (실제 발송 아님 — 제공자 미연결)", email, code)
    }

    companion object {
        private val log = LoggerFactory.getLogger(LoggingEmailSender::class.java)
    }
}
