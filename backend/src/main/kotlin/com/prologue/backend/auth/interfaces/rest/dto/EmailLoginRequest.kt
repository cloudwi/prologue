package com.prologue.backend.auth.interfaces.rest.dto

import jakarta.validation.constraints.NotBlank

/**
 * 이메일 로그인 요청 본문.
 * (로그인은 형식 검증을 느슨하게 — 자격 불일치는 401로 일괄 처리한다.)
 */
data class EmailLoginRequest(
    @field:NotBlank(message = "email은 필수입니다")
    val email: String,

    @field:NotBlank(message = "password는 필수입니다")
    val password: String,
)
