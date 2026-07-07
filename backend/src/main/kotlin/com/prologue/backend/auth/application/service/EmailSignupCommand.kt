package com.prologue.backend.auth.application.service

/**
 * 이메일 가입 유스케이스 입력.
 * - [email]: 로그인 식별자(정규화 전 원본; 서비스가 정규화한다)
 * - [password]: 평문 비밀번호(서비스가 해싱하며, 이 값은 저장/로깅되지 않는다)
 */
data class EmailSignupCommand(
    val email: String,
    val password: String,
)
