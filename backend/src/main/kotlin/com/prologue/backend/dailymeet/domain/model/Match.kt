package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 두 사용자가 같은 질문에서 서로 하트하여 성립한 매칭.
 * 방향과 무관하게 한 쌍은 하나 — accountLow/accountHigh로 정규화하여 (low, high, questionId) 유일.
 */
class Match private constructor(
    val id: UUID?,
    val accountLow: UUID,
    val accountHigh: UUID,
    val questionId: Long,
    val createdAt: Instant,
) {
    companion object {
        fun between(a: UUID, b: UUID, questionId: Long, now: Instant = Instant.now()): Match {
            if (a == b) throw DailyMeetException("자기 자신과는 매칭될 수 없어요")
            val (low, high) = if (a.toString() <= b.toString()) a to b else b to a
            return Match(null, low, high, questionId, now)
        }

        fun reconstitute(
            id: UUID,
            accountLow: UUID,
            accountHigh: UUID,
            questionId: Long,
            createdAt: Instant,
        ): Match = Match(id, accountLow, accountHigh, questionId, createdAt)
    }
}
