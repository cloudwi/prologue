package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.StampEventService
import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class ApproveStampEventRequest(
    @field:Positive(message = "amount는 1 이상이어야 합니다")
    val amount: Int,
)

data class PendingStampEventItem(
    val id: String,
    val nickname: String?,
    val url: String,
    val createdAt: java.time.Instant,
)

data class PendingStampEventsResponse(val submissions: List<PendingStampEventItem>)

/**
 * 우표 이벤트 검토 — 웹 어드민 전용. admin 하위 경로는 SecurityConfig에서 ROLE_ADMIN만 통과한다.
 * ADMIN 부여는 account_roles에 직접 INSERT (아직 부여 경로가 코드에 없다).
 */
@RestController
@RequestMapping("/admin/stamp-events")
class AdminStampEventController(
    private val stampEventService: StampEventService,
) {
    /** 검토 대기 목록 — 먼저 낸 사람부터. */
    @GetMapping
    fun pending(): PendingStampEventsResponse =
        PendingStampEventsResponse(
            stampEventService.pending().map {
                PendingStampEventItem(it.id.toString(), it.nickname, it.url, it.createdAt)
            },
        )

    /** 승인 — amount만큼 지급하고 원장(reason=EVENT)에 남긴다. */
    @PostMapping("/{id}/approve")
    fun approve(@PathVariable id: UUID, @Valid @RequestBody request: ApproveStampEventRequest) {
        stampEventService.approve(id, request.amount)
    }

    /** 반려 — 지급 없이 닫는다. */
    @PostMapping("/{id}/reject")
    fun reject(@PathVariable id: UUID) {
        stampEventService.reject(id)
    }
}
