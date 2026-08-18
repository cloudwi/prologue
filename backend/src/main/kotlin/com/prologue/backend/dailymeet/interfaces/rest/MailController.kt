package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.MailService
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.interfaces.rest.dto.MailQuoteResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.ReceivedMailItem
import com.prologue.backend.dailymeet.interfaces.rest.dto.ReceivedMailsResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.ReplyMailRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.SendMailRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.SendMailResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.SentMailToResponse
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
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
    /**
     * 편지값 견적 — 부치기 전에 화면이 얼마가 드는지 묻는다.
     * peerAnswerId(첫 편지)나 replyMailId(답장) 중 하나로 상대를 정한다. 서로 하트면 할인가.
     */
    @GetMapping("/quote")
    fun quote(
        authentication: Authentication,
        @RequestParam(required = false) peerAnswerId: String?,
        @RequestParam(required = false) replyMailId: String?,
    ): MailQuoteResponse {
        val accountId = UUID.fromString(authentication.name)
        val quote = when {
            peerAnswerId != null -> mailService.quoteFor(accountId, parseId(peerAnswerId, "상대 답변 식별자가 올바르지 않습니다"))
            replyMailId != null -> mailService.quoteForReply(accountId, parseId(replyMailId, "편지 식별자가 올바르지 않습니다"))
            else -> throw DailyMeetException("누구에게 보낼지가 필요합니다")
        }
        return MailQuoteResponse.from(quote)
    }

    private fun parseId(raw: String, message: String): UUID =
        try {
            UUID.fromString(raw)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException(message)
        }

    /** 편지 보내기. 한 통에 잉크 50, 서로 하트면 35. */
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

    /** 받은 편지에 답장 — 답장도 한 통의 편지, 값은 같은 규칙(정가/상호 하트 할인가). */
    @PostMapping("/{mailId}/reply")
    fun reply(
        authentication: Authentication,
        @PathVariable mailId: String,
        @Valid @RequestBody request: ReplyMailRequest,
    ): SendMailResponse {
        val accountId = UUID.fromString(authentication.name)
        val id = try {
            UUID.fromString(mailId)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException("편지 식별자가 올바르지 않습니다")
        }
        return SendMailResponse.from(
            mailService.reply(accountId, id, request.content, request.includePhone, request.kakaoId),
        )
    }

    /** 내가 이 상대(답변 주인)에게 보낸 편지 — 보낸 편지 확인 화면용. 없으면 mail=null. */
    @GetMapping("/sent-to/{peerAnswerId}")
    fun sentTo(
        authentication: Authentication,
        @PathVariable peerAnswerId: String,
    ): SentMailToResponse {
        val accountId = UUID.fromString(authentication.name)
        val answerId = try {
            UUID.fromString(peerAnswerId)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException("상대 답변 식별자가 올바르지 않습니다")
        }
        return SentMailToResponse.from(mailService.sentTo(accountId, answerId))
    }

    /** 받은 편지 목록, 최신순. */
    @GetMapping("/received")
    fun received(authentication: Authentication): ReceivedMailsResponse {
        val accountId = UUID.fromString(authentication.name)
        return ReceivedMailsResponse.from(mailService.received(accountId))
    }

    /** 봉투를 연다 — 열린 편지(내용·연락처 포함)를 돌려준다. */
    @PostMapping("/{mailId}/open")
    fun open(
        authentication: Authentication,
        @PathVariable mailId: String,
    ): ReceivedMailItem {
        val accountId = UUID.fromString(authentication.name)
        return ReceivedMailItem.from(mailService.open(accountId, parseMailId(mailId)))
    }

    /** 조용히 거절 — 목록에서 사라지고 보낸 사람에게는 알리지 않는다. */
    /**
     * 읽히지 않은 편지를 되찾아간다 — 잉크의 절반이 돌아온다.
     * 보낸 지 사흘이 지나고 상대가 아직 열지 않았을 때만.
     */
    @PostMapping("/{mailId}/recall")
    fun recall(
        authentication: Authentication,
        @PathVariable mailId: String,
    ) {
        mailService.recall(UUID.fromString(authentication.name), parseMailId(mailId))
    }

    @PostMapping("/{mailId}/decline")
    fun decline(
        authentication: Authentication,
        @PathVariable mailId: String,
    ) {
        val accountId = UUID.fromString(authentication.name)
        mailService.decline(accountId, parseMailId(mailId))
    }

    private fun parseMailId(mailId: String): UUID = try {
        UUID.fromString(mailId)
    } catch (e: IllegalArgumentException) {
        throw DailyMeetException("편지 식별자가 올바르지 않습니다")
    }
}
