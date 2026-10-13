package com.prologue.backend.dailymeet.interfaces.rest.dto

import jakarta.validation.constraints.Size

data class AnswerRequest(
    @field:Size(max = 300, message = "답변은 300자 이하여야 합니다")
    val content: String = "",
    @field:Size(max = 4, message = "선택지는 최대 네 개까지 고를 수 있어요")
    val selectedOptionIds: List<String> = emptyList(),
    val questionId: Long? = null,
)
