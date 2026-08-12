package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.StampEventService
import com.prologue.backend.dailymeet.application.service.StampPurchaseService
import com.prologue.backend.dailymeet.application.service.StampService
import com.prologue.backend.dailymeet.domain.model.StorePlatform
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import com.prologue.backend.dailymeet.domain.model.StampEventSubmission
import jakarta.validation.Valid
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
    private val stampPurchaseService: StampPurchaseService,
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

    /**
     * 우표 충전 — 스토어 결제를 확인하고 지급한다.
     *
     * 앱은 이 호출이 성공한 뒤에 스토어 거래를 소비(consume/finish)해야 한다.
     * 먼저 소비하면 서버 지급이 실패했을 때 유저는 돈만 내고 우표를 못 받는다.
     * 이미 처리한 거래를 다시 보내도 성공으로 답한다(alreadyProcessed=true) —
     * 실패로 답하면 앱이 거래를 소비하지 못해 영원히 재시도한다.
     */
    @PostMapping("/purchase")
    fun purchase(
        authentication: Authentication,
        @Valid @RequestBody request: StampPurchaseRequest,
    ): StampPurchaseResponse {
        val result = stampPurchaseService.purchase(
            accountId = UUID.fromString(authentication.name),
            platform = request.platform!!,
            productId = request.productId,
            token = request.token,
        )
        return StampPurchaseResponse(result.granted, result.balance, result.alreadyProcessed)
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

/** 충전 요청 — 스토어에서 받은 거래 증표를 그대로 올려보낸다. */
data class StampPurchaseRequest(
    @field:NotNull(message = "플랫폼은 필수입니다")
    val platform: StorePlatform?,
    @field:NotBlank(message = "상품 id는 필수입니다")
    val productId: String,
    /** 안드로이드는 purchase token, iOS는 transaction id. */
    @field:NotBlank(message = "거래 증표는 필수입니다")
    val token: String,
)

data class StampPurchaseResponse(
    val granted: Int,
    val balance: Int,
    val alreadyProcessed: Boolean,
)
