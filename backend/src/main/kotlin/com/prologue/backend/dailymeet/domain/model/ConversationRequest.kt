package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

enum class ConversationRequestStatus { PENDING, ACCEPTED, REJECTED }

/**
 * 대화 신청. 상대의 답변을 보고 "대화하고 싶다"고 보내는 요청.
 * 상대가 수락하면 [Conversation]이 생성된다. (하트=호감 표시와 별개)
 */
class ConversationRequest private constructor(
    val id: UUID?,
    val requesterAccountId: UUID,
    val addresseeAccountId: UUID,
    val questionId: Long,
    status: ConversationRequestStatus,
    val createdAt: Instant,
    respondedAt: Instant?,
) {
    var status: ConversationRequestStatus = status
        private set
    var respondedAt: Instant? = respondedAt
        private set

    fun accept(now: Instant = Instant.now()) {
        requirePending()
        status = ConversationRequestStatus.ACCEPTED
        respondedAt = now
    }

    fun reject(now: Instant = Instant.now()) {
        requirePending()
        status = ConversationRequestStatus.REJECTED
        respondedAt = now
    }

    private fun requirePending() {
        if (status != ConversationRequestStatus.PENDING) throw DailyMeetException("이미 처리된 대화 신청이에요")
    }

    companion object {
        fun create(requesterAccountId: UUID, addresseeAccountId: UUID, questionId: Long, now: Instant = Instant.now()): ConversationRequest {
            if (requesterAccountId == addresseeAccountId) throw DailyMeetException("자신에게는 대화를 신청할 수 없어요")
            return ConversationRequest(null, requesterAccountId, addresseeAccountId, questionId, ConversationRequestStatus.PENDING, now, null)
        }

        fun reconstitute(
            id: UUID,
            requesterAccountId: UUID,
            addresseeAccountId: UUID,
            questionId: Long,
            status: ConversationRequestStatus,
            createdAt: Instant,
            respondedAt: Instant?,
        ): ConversationRequest = ConversationRequest(id, requesterAccountId, addresseeAccountId, questionId, status, createdAt, respondedAt)
    }
}
