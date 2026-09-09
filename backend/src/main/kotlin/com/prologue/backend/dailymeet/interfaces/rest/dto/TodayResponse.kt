package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.TodayView

data class TodayResponse(
    val questionId: Long,
    val content: String,
    val answered: Boolean,
    val myAnswer: String?,
    /** 이번 요청으로 고인 잉크. 답변 저장 응답에서만 0보다 클 수 있고, 조회에서는 늘 0. */
    val inkEarned: Int = 0,
    /** 오늘 답을 이미 피드에 올렸는지. 앱이 "피드에 올림"을 다시 열어도 유지하려면 필요하다. */
    val feedPublished: Boolean = false,
) {
    companion object {
        fun from(view: TodayView, inkEarned: Int = 0, feedPublished: Boolean = false): TodayResponse =
            TodayResponse(view.questionId, view.content, view.answered, view.myAnswer, inkEarned, feedPublished)
    }
}
