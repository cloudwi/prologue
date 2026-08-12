package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.InkEventService
import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class ApproveInkEventRequest(
    @field:Positive(message = "amount는 1 이상이어야 합니다")
    val amount: Int,
)

data class PendingInkEventItem(
    val id: String,
    val nickname: String?,
    val url: String,
    val createdAt: java.time.Instant,
)

data class PendingInkEventsResponse(val submissions: List<PendingInkEventItem>)

/**
 * 잉크 이벤트 검토 — 웹 어드민 전용. admin 하위 경로는 SecurityConfig에서 ROLE_ADMIN만 통과한다.
 * ADMIN 부여는 account_roles에 직접 INSERT (아직 부여 경로가 코드에 없다).
 */
@RestController
@RequestMapping("/admin/ink-events")
class AdminInkEventController(
    private val inkEventService: InkEventService,
) {
    /** 검토 대기 목록 — 먼저 낸 사람부터. */
    @GetMapping
    fun pending(): PendingInkEventsResponse =
        PendingInkEventsResponse(
            inkEventService.pending().map {
                PendingInkEventItem(it.id.toString(), it.nickname, it.url, it.createdAt)
            },
        )

    /** 승인 — amount만큼 지급하고 원장(reason=EVENT)에 남긴다. */
    @PostMapping("/{id}/approve")
    fun approve(@PathVariable id: UUID, @Valid @RequestBody request: ApproveInkEventRequest) {
        inkEventService.approve(id, request.amount)
    }

    /** 반려 — 지급 없이 닫는다. */
    @PostMapping("/{id}/reject")
    fun reject(@PathVariable id: UUID) {
        inkEventService.reject(id)
    }
}
