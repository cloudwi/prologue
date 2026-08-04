package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.MyAnswerView
import java.time.Instant

/** 내가 남긴 답 목록 — 본인 전용, 최신순. */
data class MyAnswersResponse(
    val answers: List<Item>,
) {
    data class Item(
        val questionId: Long,
        val question: String,
        val content: String,
        val answeredAt: Instant,
    )

    companion object {
        fun from(views: List<MyAnswerView>): MyAnswersResponse =
            MyAnswersResponse(views.map { Item(it.questionId, it.question, it.content, it.answeredAt) })
    }
}
