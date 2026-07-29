package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.ProfileLetterView
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

object ProfileLetterDtos {
    data class Question(val questionId: Long, val content: String)
    data class Questions(val questions: List<Question>)

    data class WriteRequest(
        @field:NotBlank(message = "편지 내용을 적어주세요")
        @field:Size(max = 400, message = "편지는 400자 이하여야 해요")
        val content: String,
    )

    data class Letter(val questionId: Long, val question: String, val content: String)
    data class Letters(val letters: List<Letter>) {
        companion object {
            fun from(views: List<ProfileLetterView>): Letters =
                Letters(views.map { Letter(it.questionId, it.question, it.content) })
        }
    }
}
