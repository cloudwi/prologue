package com.prologue.backend.auth.application.service

/**
 * 인증코드 발송 요청 입력.
 * - [email]: 코드를 받을 이메일(정규화 전 원본; 서비스가 정규화한다)
 */
data class RequestCodeCommand(
    val email: String,
)
