package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.TodayView

data class TodayResponse(
    val questionId: Long,
    val content: String,
    val answered: Boolean,
    val myAnswer: String?,
    /** 이번 요청으로 고인 잉크. 답변 저장 응답에서만 0보다 클 수 있고, 조회에서는 늘 0. */
    val inkEarned: Int = 0,
) {
    companion object {
        fun from(view: TodayView, inkEarned: Int = 0): TodayResponse =
            TodayResponse(view.questionId, view.content, view.answered, view.myAnswer, inkEarned)
    }
}
