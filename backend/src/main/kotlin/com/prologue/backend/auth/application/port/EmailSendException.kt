package com.prologue.backend.auth.application.port

/** 이메일 발송 실패. 발송 제공자(Resend 등) 호출이 실패했을 때 어댑터가 던진다. */
class EmailSendException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)
