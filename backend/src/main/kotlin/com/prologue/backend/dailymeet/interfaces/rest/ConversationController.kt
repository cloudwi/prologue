package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.ConversationService
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.interfaces.rest.dto.AcceptResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.ConversationRequestBody
import com.prologue.backend.dailymeet.interfaces.rest.dto.ConversationRequestCreatedResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.ConversationResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.ReceivedRequestResponse
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 대화 신청/수락 + 대화 목록. 인증 필요(JWT).
 */
@RestController
@RequestMapping("/conversations")
class ConversationController(
    private val conversationService: ConversationService,
) {
    /** 상대 답변을 보고 대화 신청. */
    @PostMapping("/requests")
    fun request(
        authentication: Authentication,
        @Valid @RequestBody body: ConversationRequestBody,
    ): ConversationRequestCreatedResponse {
        val me = UUID.fromString(authentication.name)
        val peerAnswerId = parseUuid(body.peerAnswerId, "상대 답변 식별자가 올바르지 않습니다")
        return ConversationRequestCreatedResponse(conversationService.sendRequest(me, peerAnswerId).toString())
    }

    /** 내가 받은 대화 신청(대기 중). */
    @GetMapping("/requests/received")
    fun received(authentication: Authentication): List<ReceivedRequestResponse> {
        val me = UUID.fromString(authentication.name)
        return conversationService.receivedRequests(me).map(ReceivedRequestResponse::from)
    }

    /** 대화 신청 수락 → 대화 생성. */
    @PostMapping("/requests/{id}/accept")
    fun accept(authentication: Authentication, @PathVariable id: String): AcceptResponse {
        val me = UUID.fromString(authentication.name)
        return AcceptResponse(conversationService.accept(me, parseUuid(id, "잘못된 신청 식별자")).toString())
    }

    /** 대화 신청 거절. */
    @PostMapping("/requests/{id}/reject")
    fun reject(authentication: Authentication, @PathVariable id: String) {
        val me = UUID.fromString(authentication.name)
        conversationService.reject(me, parseUuid(id, "잘못된 신청 식별자"))
    }

    /** 내 대화 목록. */
    @GetMapping
    fun conversations(authentication: Authentication): List<ConversationResponse> {
        val me = UUID.fromString(authentication.name)
        return conversationService.myConversations(me).map(ConversationResponse::from)
    }

    private fun parseUuid(value: String, message: String): UUID =
        try {
            UUID.fromString(value)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException(message)
        }
}
