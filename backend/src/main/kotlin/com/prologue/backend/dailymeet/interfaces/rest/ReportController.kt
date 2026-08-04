package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.ReportService
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** 신고 요청 — peerAnswerId(프로필·답변) 또는 mailId(받은 편지) 중 하나. */
data class ReportRequest(
    val peerAnswerId: String? = null,
    val mailId: String? = null,

    @field:NotBlank(message = "신고 사유가 필요합니다")
    val reason: String,
)

/**
 * 신고 — 사용자 콘텐츠 검토 요청(앱스토어 UGC 요건). 인증 필요(JWT).
 */
@RestController
@RequestMapping("/reports")
class ReportController(
    private val reportService: ReportService,
) {
    @PostMapping
    fun report(
        authentication: Authentication,
        @Valid @RequestBody request: ReportRequest,
    ) {
        val accountId = UUID.fromString(authentication.name)
        when {
            request.peerAnswerId != null -> reportService.reportAnswer(accountId, parse(request.peerAnswerId), request.reason)
            request.mailId != null -> reportService.reportMail(accountId, parse(request.mailId), request.reason)
            else -> throw DailyMeetException("신고 대상이 필요합니다")
        }
    }

    private fun parse(id: String): UUID = try {
        UUID.fromString(id)
    } catch (e: IllegalArgumentException) {
        throw DailyMeetException("신고 대상 식별자가 올바르지 않습니다")
    }
}
