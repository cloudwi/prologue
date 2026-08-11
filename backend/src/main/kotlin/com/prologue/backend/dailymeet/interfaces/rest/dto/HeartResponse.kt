package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.HeartResult

data class HeartResponse(
    val hearted: Boolean,
    /** 서로 하트 — 마음이 통했다. */
    val matched: Boolean,
    /** 이번 하트로 우표를 받았는지(하트 5번마다 1장). */
    val stampEarned: Boolean,
) {
    companion object {
        fun from(result: HeartResult): HeartResponse =
            HeartResponse(result.hearted, result.matched, result.stampEarned)
    }
}
