package com.prologue.backend.dailymeet.interfaces.rest.dto

import jakarta.validation.constraints.NotBlank

data class AnswerRequest(
    @field:NotBlank(message = "답변을 입력해주세요")
    val content: String,
)
