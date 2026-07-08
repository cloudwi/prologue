package com.prologue.backend.auth.interfaces.rest.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

/** 인증코드 검증(로그인) 요청 본문. */
data class VerifyCodeRequest(
    @field:NotBlank(message = "email은 필수입니다")
    @field:Email(message = "email 형식이 올바르지 않습니다")
    val email: String,

    @field:NotBlank(message = "code는 필수입니다")
    @field:Pattern(regexp = "\\d{6}", message = "code는 6자리 숫자여야 합니다")
    val code: String,
)
