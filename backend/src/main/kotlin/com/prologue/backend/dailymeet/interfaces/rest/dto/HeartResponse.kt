package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.HeartResult

data class HeartResponse(
    val hearted: Boolean,
    /** 서로 하트 — 마음이 통했다. */
    val matched: Boolean,
) {
    companion object {
        fun from(result: HeartResult): HeartResponse =
            HeartResponse(result.hearted, result.matched)
    }
}
