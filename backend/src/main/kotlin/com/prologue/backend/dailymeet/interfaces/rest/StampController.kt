package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.StampEventService
import com.prologue.backend.dailymeet.application.service.StampService
import com.prologue.backend.dailymeet.domain.model.StampEventSubmission
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class StampBalanceResponse(val balance: Int)

data class StampHistoryItem(val amount: Int, val reason: String, val createdAt: java.time.Instant)

data class StampWalletResponse(val balance: Int, val history: List<StampHistoryItem>)

data class SubmitStampEventRequest(
    @field:NotBlank(message = "url은 필수입니다")
    val url: String,
)

data class StampEventSubmissionItem(
    val id: String,
    val url: String,
    val status: String,
    val grantedAmount: Int?,
    val createdAt: java.time.Instant,
) {
    companion object {
        fun from(s: StampEventSubmission): StampEventSubmissionItem =
            StampEventSubmissionItem(s.id.toString(), s.url, s.status.name, s.grantedAmount, s.createdAt)
    }
}

data class StampEventSubmissionsResponse(val submissions: List<StampEventSubmissionItem>)

/** 우표(재화) 조회 + 이벤트 제출. 인증 필요(JWT). 충전 엔드포인트는 출시 직전 IAP와 함께 붙는다. */
@RestController
@RequestMapping("/stamps")
class StampController(
    private val stampService: StampService,
    private val stampEventService: StampEventService,
) {
    @GetMapping
    fun balance(authentication: Authentication): StampBalanceResponse =
        StampBalanceResponse(stampService.balance(UUID.fromString(authentication.name)))

    /** 지갑 화면 — 잔액 + 최근 증감 내역(최신순, 최대 50건). */
    @GetMapping("/wallet")
    fun wallet(authentication: Authentication): StampWalletResponse {
        val view = stampService.wallet(UUID.fromString(authentication.name))
        return StampWalletResponse(
            balance = view.balance,
            history = view.history.map { StampHistoryItem(it.amount, it.reason, it.createdAt) },
        )
    }

    /** 이벤트 제출 — 블로그 후기 링크. 검토 중 1건만 가능. 갱신된 내 제출 이력을 돌려준다. */
    @PostMapping("/events")
    fun submitEvent(
        authentication: Authentication,
        @Valid @RequestBody request: SubmitStampEventRequest,
    ): StampEventSubmissionsResponse {
        val submissions = stampEventService.submit(UUID.fromString(authentication.name), request.url)
        return StampEventSubmissionsResponse(submissions.map { StampEventSubmissionItem.from(it) })
    }

    /** 내 이벤트 제출 이력, 최신순. */
    @GetMapping("/events")
    fun myEvents(authentication: Authentication): StampEventSubmissionsResponse {
        val submissions = stampEventService.mySubmissions(UUID.fromString(authentication.name))
        return StampEventSubmissionsResponse(submissions.map { StampEventSubmissionItem.from(it) })
    }
}
