package com.prologue.backend.auth.application.service

/**
 * 인증코드 검증(로그인) 입력.
 * - [email]: 코드를 받은 이메일(정규화 전 원본)
 * - [code]: 사용자가 입력한 6자리 코드
 */
data class VerifyCodeCommand(
    val email: String,
    val code: String,
)
