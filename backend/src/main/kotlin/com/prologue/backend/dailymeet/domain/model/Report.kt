package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 신고 — 사용자 콘텐츠(답변·편지) 검토 요청.
 * 신고 시점의 콘텐츠 사본(snapshot)을 함께 남긴다: 원본이 지워지거나
 * 작성자가 탈퇴로 증발해도 검토는 가능해야 한다.
 */
class Report private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val reporterAccountId: UUID,
    val reportedAccountId: UUID,
    val context: String,
    val reason: String,
    val snapshot: String?,
    val createdAt: Instant,
    status: String,
    resolvedAt: Instant?,
) {
    /** 처리 상태 — PENDING(대기) → DISMISSED(기각) | RESOLVED(조치 완료). */
    var status: String = status
        private set

    var resolvedAt: Instant? = resolvedAt
        private set

    /** 기각 — 검토 결과 문제없음. */
    fun dismiss(now: Instant = Instant.now()) = close(STATUS_DISMISSED, now)

    /** 조치 완료 — 피신고 계정 제재 등 조치를 마쳤다. */
    fun resolve(now: Instant = Instant.now()) = close(STATUS_RESOLVED, now)

    private fun close(newStatus: String, now: Instant) {
        if (status != STATUS_PENDING) throw DailyMeetException("이미 처리된 신고예요")
        status = newStatus
        resolvedAt = now
    }

    companion object {
        val REASONS = setOf("SPAM", "ABUSE", "SEXUAL", "FAKE", "OTHER")
        const val CONTEXT_ANSWER = "ANSWER"
        const val CONTEXT_MAIL = "MAIL"
        const val STATUS_PENDING = "PENDING"
        const val STATUS_DISMISSED = "DISMISSED"
        const val STATUS_RESOLVED = "RESOLVED"
        private const val SNAPSHOT_MAX = 1000

        fun file(
            reporterAccountId: UUID,
            reportedAccountId: UUID,
            context: String,
            reason: String,
            snapshot: String?,
            now: Instant = Instant.now(),
        ): Report {
            if (reason !in REASONS) throw DailyMeetException("신고 사유가 올바르지 않습니다")
            if (reporterAccountId == reportedAccountId) throw DailyMeetException("자신은 신고할 수 없어요")
            return Report(
                null, reporterAccountId, reportedAccountId, context, reason,
                snapshot?.take(SNAPSHOT_MAX), now, STATUS_PENDING, null,
            )
        }

        fun reconstitute(
            id: UUID,
            reporterAccountId: UUID,
            reportedAccountId: UUID,
            context: String,
            reason: String,
            snapshot: String?,
            createdAt: Instant,
            status: String,
            resolvedAt: Instant?,
        ): Report = Report(id, reporterAccountId, reportedAccountId, context, reason, snapshot, createdAt, status, resolvedAt)
    }
}
