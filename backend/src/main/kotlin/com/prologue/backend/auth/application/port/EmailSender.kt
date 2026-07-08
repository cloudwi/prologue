package com.prologue.backend.auth.application.port

/**
 * 이메일 발송 아웃 포트(SPI).
 *
 * 현재 구현: 개발용 로그 발송(LoggingEmailSender) — 코드를 서버 로그에 출력한다.
 * 추후 실제 제공자(Resend/SES 등) 어댑터로 교체.
 */
interface EmailSender {
    /** 인증코드를 이메일로 발송. */
    fun sendVerificationCode(email: String, code: String)
}
