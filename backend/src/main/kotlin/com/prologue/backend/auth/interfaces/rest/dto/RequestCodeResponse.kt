package com.prologue.backend.auth.interfaces.rest.dto

/**
 * 인증코드 발송 응답. 코드 자체는 절대 담지 않는다(이메일로만 전달).
 * [expiresInSeconds]로 앱이 재요청 타이머를 표시한다.
 */
data class RequestCodeResponse(
    val expiresInSeconds: Long,
)
