package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 대화방 안에서 주고받는 메시지(문답/대화). 한 대화(Conversation)에 시간순으로 쌓인다.
 */
class Message private constructor(
    val id: UUID?,
    val conversationId: UUID,
    val senderAccountId: UUID,
    content: String,
    val createdAt: Instant,
) {
    var content: String = content
        private set

    companion object {
        private const val MAX_LENGTH = 1000

        fun write(conversationId: UUID, senderAccountId: UUID, content: String, now: Instant = Instant.now()): Message =
            Message(null, conversationId, senderAccountId, validate(content), now)

        fun reconstitute(id: UUID, conversationId: UUID, senderAccountId: UUID, content: String, createdAt: Instant): Message =
            Message(id, conversationId, senderAccountId, content, createdAt)

        private fun validate(content: String): String {
            val trimmed = content.trim()
            if (trimmed.isBlank()) throw DailyMeetException("메시지는 비어 있을 수 없습니다")
            if (trimmed.length > MAX_LENGTH) throw DailyMeetException("메시지는 ${MAX_LENGTH}자 이하여야 합니다")
            return trimmed
        }
    }
}
