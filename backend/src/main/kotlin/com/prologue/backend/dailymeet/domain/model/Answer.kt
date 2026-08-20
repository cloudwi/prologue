package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 한 사용자가 특정 질문에 남긴 답변. (accountId, questionId) 당 하나.
 * 블라인드 규칙: 답변해야 상대 답변을 열람 가능 — 서비스 레이어에서 강제.
 */
class Answer private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val accountId: UUID,
    val questionId: Long,
    content: String,
    val createdAt: Instant,
) {
    var content: String = content
        private set

    fun updateContent(newContent: String) {
        this.content = validate(newContent)
    }

    companion object {
        private const val MAX_LENGTH = 300 // 한 문답에 맞는 분량 (짧은 글)

        /**
         * 최소 분량 — "ㅇㅇ", "비밀이에요" 같은 한 마디를 거른다.
         * 답변은 상대에게 나를 소개하는 글이자 매칭의 재료라, 아무 말이나 적고 넘어가면
         * 그 답을 받아 든 상대의 하루가 빈다. 성의의 하한이지 글솜씨의 문턱이 아니다 — 낮게 둔다.
         */
        private const val MIN_LENGTH = 15

        fun write(accountId: UUID, questionId: Long, content: String, now: Instant = Instant.now()): Answer =
            Answer(null, accountId, questionId, validate(content), now)

        fun reconstitute(
            id: UUID,
            accountId: UUID,
            questionId: Long,
            content: String,
            createdAt: Instant,
        ): Answer = Answer(id, accountId, questionId, content, createdAt)

        private fun validate(content: String): String {
            val trimmed = content.trim()
            if (trimmed.isBlank()) throw DailyMeetException("답변은 비어 있을 수 없습니다")
            if (trimmed.length < MIN_LENGTH) throw DailyMeetException("조금 더 들려주세요 — ${MIN_LENGTH}자 이상 적어야 해요")
            if (trimmed.length > MAX_LENGTH) throw DailyMeetException("답변은 ${MAX_LENGTH}자 이하여야 합니다")
            return trimmed
        }
    }
}
