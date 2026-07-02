package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.HeartResult

data class HeartResponse(
    val hearted: Boolean,
) {
    companion object {
        fun from(result: HeartResult): HeartResponse = HeartResponse(result.hearted)
    }
}
