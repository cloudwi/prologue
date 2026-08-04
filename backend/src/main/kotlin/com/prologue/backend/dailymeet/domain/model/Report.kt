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
) {
    companion object {
        val REASONS = setOf("SPAM", "ABUSE", "SEXUAL", "FAKE", "OTHER")
        const val CONTEXT_ANSWER = "ANSWER"
        const val CONTEXT_MAIL = "MAIL"
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
            return Report(null, reporterAccountId, reportedAccountId, context, reason, snapshot?.take(SNAPSHOT_MAX), now)
        }

        fun reconstitute(
            id: UUID,
            reporterAccountId: UUID,
            reportedAccountId: UUID,
            context: String,
            reason: String,
            snapshot: String?,
            createdAt: Instant,
        ): Report = Report(id, reporterAccountId, reportedAccountId, context, reason, snapshot, createdAt)
    }
}
