package com.prologue.backend.auth.interfaces.rest.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

/** 인증코드 발송 요청 본문. */
data class RequestCodeRequest(
    @field:NotBlank(message = "email은 필수입니다")
    @field:Email(message = "email 형식이 올바르지 않습니다")
    val email: String,
)
