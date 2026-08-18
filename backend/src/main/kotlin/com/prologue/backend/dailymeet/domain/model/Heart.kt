package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 오늘의 질문에서, 한 사용자가 익명의 상대 답변에 보낸 하트(호감).
 * (fromAccountId, toAccountId, questionId) 당 하나. 가벼운 호감 표시이며, 연결은 '대화 신청'으로 별도 처리된다.
 */
class Heart private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val fromAccountId: UUID,
    val toAccountId: UUID,
    val questionId: Long,
    val createdAt: Instant,
) {
    companion object {
        fun send(fromAccountId: UUID, toAccountId: UUID, questionId: Long, now: Instant = Instant.now()): Heart {
            if (fromAccountId == toAccountId) throw DailyMeetException("자신에게는 호감을 보낼 수 없어요")
            return Heart(null, fromAccountId, toAccountId, questionId, now)
        }

        fun reconstitute(
            id: UUID,
            fromAccountId: UUID,
            toAccountId: UUID,
            questionId: Long,
            createdAt: Instant,
        ): Heart = Heart(id, fromAccountId, toAccountId, questionId, createdAt)
    }
}
