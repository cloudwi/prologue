package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.ConversationView
import com.prologue.backend.dailymeet.application.service.ReceivedRequestView
import com.prologue.backend.member.domain.model.Gender
import jakarta.validation.constraints.NotBlank

data class ConversationRequestBody(
    @field:NotBlank(message = "상대 답변 식별자가 필요합니다")
    val peerAnswerId: String,
)

data class ConversationRequestCreatedResponse(val requestId: String)

data class AcceptResponse(val conversationId: String)

data class ReceivedRequestResponse(
    val requestId: String,
    val questionContent: String,
    val requesterAnswer: String,
    val createdAt: String,
) {
    companion object {
        fun from(v: ReceivedRequestView) = ReceivedRequestResponse(
            requestId = v.requestId.toString(),
            questionContent = v.questionContent,
            requesterAnswer = v.requesterAnswer,
            createdAt = v.createdAt.toString(),
        )
    }
}

data class ConversationResponse(
    val conversationId: String,
    val peerAccountId: String,
    val nickname: String,
    val gender: Gender,
    val birthYear: Int,
    val region: String,
) {
    companion object {
        fun from(v: ConversationView) = ConversationResponse(
            conversationId = v.conversationId.toString(),
            peerAccountId = v.peerAccountId.toString(),
            nickname = v.nickname,
            gender = v.gender,
            birthYear = v.birthYear,
            region = v.region,
        )
    }
}
