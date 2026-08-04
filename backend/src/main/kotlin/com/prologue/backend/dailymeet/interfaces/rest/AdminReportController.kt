package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.ReportService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

data class ReportItem(
    val id: String,
    val reporterNickname: String?,
    val reportedNickname: String?,
    val context: String,
    val reason: String,
    val snapshot: String?,
    val createdAt: Instant,
)

data class ReportsResponse(val reports: List<ReportItem>)

/**
 * 신고 검토 — 웹 어드민 전용(ROLE_ADMIN). 조치는 아직 수동:
 * 스냅샷을 보고 필요하면 Supabase에서 직접 처리한다. 조치 버튼은 신고가 실제로 쌓이면 붙인다.
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
                )
            },
        )
}
