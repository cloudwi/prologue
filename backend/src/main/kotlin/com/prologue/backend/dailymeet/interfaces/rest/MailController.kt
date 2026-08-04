package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.MailService
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.interfaces.rest.dto.ReceivedMailsResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.SendMailRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.SendMailResponse
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 편지 — 인앱 채팅 대신 연락처를 건네는 한 통. 인증 필요(JWT).
 */
@RestController
@RequestMapping("/mails")
class MailController(
    private val mailService: MailService,
) {
    /** 편지 보내기. 상호 하트면 무료, 아니면 우표 1장. */
    @PostMapping
    fun send(
        authentication: Authentication,
        @Valid @RequestBody request: SendMailRequest,
    ): SendMailResponse {
        val accountId = UUID.fromString(authentication.name)
        val peerAnswerId = try {
            UUID.fromString(request.peerAnswerId)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException("상대 답변 식별자가 올바르지 않습니다")
        }
        return SendMailResponse.from(
            mailService.send(accountId, peerAnswerId, request.content, request.includePhone, request.kakaoId),
        )
    }

    /** 받은 편지 목록, 최신순. */
    @GetMapping("/received")
    fun received(authentication: Authentication): ReceivedMailsResponse {
        val accountId = UUID.fromString(authentication.name)
        return ReceivedMailsResponse.from(mailService.received(accountId))
    }
}
