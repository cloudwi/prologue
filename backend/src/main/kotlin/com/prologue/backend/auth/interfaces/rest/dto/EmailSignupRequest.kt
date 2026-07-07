package com.prologue.backend.auth.interfaces.rest.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * 이메일 가입 요청 본문.
 */
data class EmailSignupRequest(
    @field:NotBlank(message = "email은 필수입니다")
    @field:Email(message = "email 형식이 올바르지 않습니다")
    val email: String,

    @field:NotBlank(message = "password는 필수입니다")
    @field:Size(min = 8, max = 72, message = "password는 8자 이상 72자 이하여야 합니다")
    val password: String,
)
