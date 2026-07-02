package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 두 사람의 대화. 대화 신청이 수락되면 생성된다. 한 쌍당 하나(accountLow/High 정규화).
 * (P3에서 여기에 1:1 문답 메시지가 쌓인다)
 */
class Conversation private constructor(
    val id: UUID?,
    val accountLow: UUID,
    val accountHigh: UUID,
    val createdAt: Instant,
) {
    companion object {
        fun between(a: UUID, b: UUID, now: Instant = Instant.now()): Conversation {
            if (a == b) throw DailyMeetException("자기 자신과는 대화할 수 없어요")
            val (low, high) = if (a.toString() <= b.toString()) a to b else b to a
            return Conversation(null, low, high, now)
        }

        fun reconstitute(id: UUID, accountLow: UUID, accountHigh: UUID, createdAt: Instant): Conversation =
            Conversation(id, accountLow, accountHigh, createdAt)
    }
}
