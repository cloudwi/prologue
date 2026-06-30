package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 한 사용자(viewer)가 특정 질문에 대해 '오늘 본 상대 답변'을 고정한 기록.
 * (viewer, questionId) 당 하나 — 하루 동안 같은 상대를 보여주기 위함(비독점: 같은 상대가 여러 viewer에게 노출 가능).
 */
class DailyReveal private constructor(
    val id: UUID?,
    val viewerAccountId: UUID,
    val questionId: Long,
    val peerAnswerId: UUID,
    val createdAt: Instant,
) {
    companion object {
        fun create(viewerAccountId: UUID, questionId: Long, peerAnswerId: UUID, now: Instant = Instant.now()): DailyReveal =
            DailyReveal(null, viewerAccountId, questionId, peerAnswerId, now)

        fun reconstitute(
            id: UUID,
            viewerAccountId: UUID,
            questionId: Long,
            peerAnswerId: UUID,
            createdAt: Instant,
        ): DailyReveal = DailyReveal(id, viewerAccountId, questionId, peerAnswerId, createdAt)
    }
}
