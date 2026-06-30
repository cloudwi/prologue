package com.prologue.backend.dailymeet.interfaces.rest.dto

import jakarta.validation.constraints.NotBlank

data class HeartRequest(
    @field:NotBlank(message = "상대 답변 식별자가 필요합니다")
    val peerAnswerId: String,
)
