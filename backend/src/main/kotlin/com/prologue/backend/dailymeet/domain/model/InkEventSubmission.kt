package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 잉크 이벤트 제출 — 블로그 후기 링크 하나. 운영자가 검토해 승인(잉크 지급) 또는 반려한다.
 * 한 번 처리된 제출은 되돌릴 수 없다 — 지급이 원장에 이미 남았기 때문.
 */
class InkEventSubmission private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val accountId: UUID,
    val url: String,
    status: Status,
    grantedAmount: Int?,
    val createdAt: Instant,
    decidedAt: Instant?,
) {
    enum class Status { PENDING, APPROVED, REJECTED }

    var status: Status = status
        private set
    var grantedAmount: Int? = grantedAmount
        private set
    var decidedAt: Instant? = decidedAt
        private set

    fun approve(amount: Int, now: Instant = Instant.now()) {
        if (status != Status.PENDING) throw DailyMeetException("이미 처리된 제출이에요")
        if (amount <= 0) throw DailyMeetException("지급할 잉크 양이 올바르지 않습니다")
        status = Status.APPROVED
        grantedAmount = amount
        decidedAt = now
    }

    fun reject(now: Instant = Instant.now()) {
        if (status != Status.PENDING) throw DailyMeetException("이미 처리된 제출이에요")
        status = Status.REJECTED
        decidedAt = now
    }

    companion object {
        private const val MAX_URL_LENGTH = 500

        fun submit(accountId: UUID, url: String, now: Instant = Instant.now()): InkEventSubmission {
            val trimmed = url.trim()
            if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
                throw DailyMeetException("올바른 링크를 입력해주세요")
            }
            if (trimmed.length > MAX_URL_LENGTH) throw DailyMeetException("링크가 너무 길어요")
            return InkEventSubmission(null, accountId, trimmed, Status.PENDING, null, now, null)
        }

        fun reconstitute(
            id: UUID,
            accountId: UUID,
            url: String,
            status: Status,
            grantedAmount: Int?,
            createdAt: Instant,
            decidedAt: Instant?,
        ): InkEventSubmission = InkEventSubmission(id, accountId, url, status, grantedAmount, createdAt, decidedAt)
    }
}
