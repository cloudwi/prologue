package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 프로필 편지 — 질문 풀에서 골라 미리 써두는 자기소개. (accountId, questionId) 당 하나.
 * 오늘의 문답에 쓴 답변을 그대로 올려도 되고, 아무 질문이나 골라 새로 써도 된다.
 * 계정당 최대 [MAX_PER_MEMBER]개 — 개수 제한은 서비스에서 강제한다.
 */
class ProfileLetter private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val accountId: UUID,
    val questionId: Long,
    content: String,
    val createdAt: Instant,
    updatedAt: Instant,
) {
    var content: String = content
        private set
    var updatedAt: Instant = updatedAt
        private set

    fun updateContent(newContent: String, now: Instant = Instant.now()) {
        this.content = validate(newContent)
        this.updatedAt = now
    }

    companion object {
        const val MAX_PER_MEMBER = 3
        const val MAX_LENGTH = 400 // 자기소개를 대신하는 글 — 한 문답 답변(300자)보다 여유 있게

        fun write(accountId: UUID, questionId: Long, content: String, now: Instant = Instant.now()): ProfileLetter =
            ProfileLetter(null, accountId, questionId, validate(content), now, now)

        fun reconstitute(
            id: UUID,
            accountId: UUID,
            questionId: Long,
            content: String,
            createdAt: Instant,
            updatedAt: Instant,
        ): ProfileLetter = ProfileLetter(id, accountId, questionId, content, createdAt, updatedAt)

        private fun validate(content: String): String {
            val trimmed = content.trim()
            if (trimmed.isBlank()) throw DailyMeetException("편지는 비어 있을 수 없습니다")
            if (trimmed.length > MAX_LENGTH) throw DailyMeetException("편지는 ${MAX_LENGTH}자 이하여야 합니다")
            return trimmed
        }
    }
}
