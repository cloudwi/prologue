package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.ReportService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

data class ReportItem(
    val id: String,
    val reporterNickname: String?,
    val reportedNickname: String?,
    val context: String,
    val reason: String,
    val snapshot: String?,
    val createdAt: Instant,
    val status: String,
    val resolvedAt: Instant?,
)

data class ReportsResponse(val reports: List<ReportItem>)

/**
 * 신고 검토 — 웹 어드민 전용(ROLE_ADMIN).
 * 기각(dismiss) 또는 피신고 계정 정지(suspend)로 처리한다. 정지 해제는 아직 수동(Supabase).
 */
@RestController
@RequestMapping("/admin/reports")
class AdminReportController(
    private val reportService: ReportService,
) {
    /** 최근 신고 목록, 최신순. */
    @GetMapping
    fun recent(): ReportsResponse =
        ReportsResponse(
            reportService.recent().map {
                ReportItem(
                    id = it.id.toString(),
                    reporterNickname = it.reporterNickname,
                    reportedNickname = it.reportedNickname,
                    context = it.context,
                    reason = it.reason,
                    snapshot = it.snapshot,
                    createdAt = it.createdAt,
                    status = it.status,
                    resolvedAt = it.resolvedAt,
                )
            },
        )

    /** 기각 — 검토 결과 문제없음. */
    @PostMapping("/{id}/dismiss")
    fun dismiss(@PathVariable id: UUID) = reportService.dismiss(id)

    /** 피신고 계정 정지 + 조치 완료 처리. */
    @PostMapping("/{id}/suspend")
    fun suspend(@PathVariable id: UUID) = reportService.suspendReported(id)
}
