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
        /**
         * 계정당 프로필 문답 수. 3 → 5로 늘렸다(2026-08-25).
         * 3개는 사진 사이를 채우기엔 모자라서 프로필이 사진 위주로 읽혔다.
         * 늘리되 무한은 아니다 — 다 읽을 수 있는 분량이라야 청첩장이지 이력서가 아니다.
         */
        const val MAX_PER_MEMBER = 5
        const val MAX_LENGTH = 400 // 자기소개를 대신하는 글 — 한 문답 답변(300자)보다 여유 있게
        /** 최소 분량 — 프로필에 걸어두는 글이 한 마디로 끝나지 않도록. 답변과 같은 하한. */
        const val MIN_LENGTH = 15

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
            if (trimmed.length < MIN_LENGTH) throw DailyMeetException("조금 더 들려주세요 — ${MIN_LENGTH}자 이상 적어야 해요")
            if (trimmed.length > MAX_LENGTH) throw DailyMeetException("편지는 ${MAX_LENGTH}자 이하여야 합니다")
            return trimmed
        }
    }
}
