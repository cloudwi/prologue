package com.prologue.backend.auth.application.service

/**
 * 이메일 로그인 유스케이스 입력.
 * - [email]: 로그인 식별자(정규화 전 원본; 서비스가 정규화한다)
 * - [password]: 평문 비밀번호(저장된 해시와 대조)
 */
data class EmailLoginCommand(
    val email: String,
    val password: String,
)
