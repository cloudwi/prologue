package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.InkEventService
import com.prologue.backend.dailymeet.application.service.InkPurchaseService
import com.prologue.backend.dailymeet.application.service.InkService
import com.prologue.backend.dailymeet.domain.model.StorePlatform
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import com.prologue.backend.dailymeet.domain.model.InkEventSubmission
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class InkBalanceResponse(val balance: Int)

data class InkHistoryItem(val amount: Int, val reason: String, val createdAt: java.time.Instant)

data class InkWalletResponse(val balance: Int, val history: List<InkHistoryItem>)

data class SubmitInkEventRequest(
    @field:NotBlank(message = "url은 필수입니다")
    val url: String,
)

data class InkEventSubmissionItem(
    val id: String,
    val url: String,
    val status: String,
    val grantedAmount: Int?,
    val createdAt: java.time.Instant,
) {
    companion object {
        fun from(s: InkEventSubmission): InkEventSubmissionItem =
            InkEventSubmissionItem(s.id.toString(), s.url, s.status.name, s.grantedAmount, s.createdAt)
    }
}

data class InkEventSubmissionsResponse(val submissions: List<InkEventSubmissionItem>)

/**
 * 잉크(재화) 조회 + 이벤트 제출 + 충전. 인증 필요(JWT).
 *
 * "/stamps"도 함께 받는 건 이미 스토어에 나가 있는 앱을 위한 다리다. 그 앱들은 재화가
 * 우표이던 시절의 주소를 부르는데, 그 길을 끊으면 새 빌드가 퍼지기 전에 지갑 화면이 죽는다.
 * app.min-supported-version을 새 빌드 이상으로 올린 뒤에 지운다.
 */
@RestController
@RequestMapping("/ink", "/stamps")
class InkController(
    private val inkService: InkService,
    private val inkEventService: InkEventService,
    private val inkPurchaseService: InkPurchaseService,
) {
    @GetMapping
    fun balance(authentication: Authentication): InkBalanceResponse =
        InkBalanceResponse(inkService.balance(UUID.fromString(authentication.name)))

    /** 지갑 화면 — 잔액 + 최근 증감 내역(최신순, 최대 50건). */
    @GetMapping("/wallet")
    fun wallet(authentication: Authentication): InkWalletResponse {
        val view = inkService.wallet(UUID.fromString(authentication.name))
        return InkWalletResponse(
            balance = view.balance,
            history = view.history.map { InkHistoryItem(it.amount, it.reason, it.createdAt) },
        )
    }

    /**
     * 잉크 충전 — 스토어 결제를 확인하고 지급한다.
     *
     * 앱은 이 호출이 성공한 뒤에 스토어 거래를 소비(consume/finish)해야 한다.
     * 먼저 소비하면 서버 지급이 실패했을 때 유저는 돈만 내고 잉크를 못 받는다.
     * 이미 처리한 거래를 다시 보내도 성공으로 답한다(alreadyProcessed=true) —
     * 실패로 답하면 앱이 거래를 소비하지 못해 영원히 재시도한다.
     */
    @PostMapping("/purchase")
    fun purchase(
        authentication: Authentication,
        @Valid @RequestBody request: InkPurchaseRequest,
    ): InkPurchaseResponse {
        val result = inkPurchaseService.purchase(
            accountId = UUID.fromString(authentication.name),
            platform = request.platform!!,
            productId = request.productId,
            token = request.token,
        )
        return InkPurchaseResponse(result.granted, result.balance, result.alreadyProcessed)
    }

    /** 이벤트 제출 — 블로그 후기 링크. 검토 중 1건만 가능. 갱신된 내 제출 이력을 돌려준다. */
    @PostMapping("/events")
    fun submitEvent(
        authentication: Authentication,
        @Valid @RequestBody request: SubmitInkEventRequest,
    ): InkEventSubmissionsResponse {
        val submissions = inkEventService.submit(UUID.fromString(authentication.name), request.url)
        return InkEventSubmissionsResponse(submissions.map { InkEventSubmissionItem.from(it) })
    }

    /** 내 이벤트 제출 이력, 최신순. */
    @GetMapping("/events")
    fun myEvents(authentication: Authentication): InkEventSubmissionsResponse {
        val submissions = inkEventService.mySubmissions(UUID.fromString(authentication.name))
        return InkEventSubmissionsResponse(submissions.map { InkEventSubmissionItem.from(it) })
    }
}

/** 충전 요청 — 스토어에서 받은 거래 증표를 그대로 올려보낸다. */
data class InkPurchaseRequest(
    @field:NotNull(message = "플랫폼은 필수입니다")
    val platform: StorePlatform?,
    @field:NotBlank(message = "상품 id는 필수입니다")
    val productId: String,
    /** 안드로이드는 purchase token, iOS는 transaction id. */
    @field:NotBlank(message = "거래 증표는 필수입니다")
    val token: String,
)

data class InkPurchaseResponse(
    val granted: Int,
    val balance: Int,
    val alreadyProcessed: Boolean,
)
