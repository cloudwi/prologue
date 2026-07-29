package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.HeartResult

data class HeartResponse(
    val hearted: Boolean,
    /** 서로 하트를 보내 대화가 열렸는지. */
    val matched: Boolean,
    val conversationId: String?,
) {
    companion object {
        fun from(result: HeartResult): HeartResponse =
            HeartResponse(result.hearted, result.matched, result.conversationId?.toString())
    }
}
