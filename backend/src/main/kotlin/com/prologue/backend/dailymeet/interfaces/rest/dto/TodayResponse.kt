package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.TodayView

data class TodayResponse(
    val questionId: Long,
    val content: String,
    val answered: Boolean,
    val myAnswer: String?,
) {
    companion object {
        fun from(view: TodayView): TodayResponse =
            TodayResponse(view.questionId, view.content, view.answered, view.myAnswer)
    }
}
