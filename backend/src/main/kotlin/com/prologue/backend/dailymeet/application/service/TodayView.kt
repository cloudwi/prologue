package com.prologue.backend.dailymeet.application.service

/** 오늘의 문답 현황. answered=false면 앱은 답변 입력을, true면 내 답변(+추후 상대 답변)을 보여준다. */
data class TodayView(
    val questionId: Long,
    val content: String,
    val answered: Boolean,
    val myAnswer: String?,
)
