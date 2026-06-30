package com.prologue.backend.dailymeet.interfaces.rest.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class AnswerRequest(
    @field:NotBlank(message = "답변을 입력해주세요")
    @field:Size(max = 300, message = "답변은 300자 이하여야 합니다")
    val content: String,
)
