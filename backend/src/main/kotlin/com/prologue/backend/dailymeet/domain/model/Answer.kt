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
    selectedOptionIds: List<String> = emptyList(),
) {
    var selectedOptionIds: List<String> = selectedOptionIds.toList()
        private set
    var content: String = content
        private set

    fun updateContent(newContent: String, selection: List<String> = emptyList()) {
        this.content = validate(newContent)
        this.selectedOptionIds = selection.toList()
    }

    companion object {
        private const val MAX_LENGTH = 500 // 한 문답에 맞는 분량. 하고 싶은 말이 있는데 잘리면 이 앱의 취지와 어긋난다

        /** 한 단어와 선택형도 온전한 답이다. 빈 답만 막고 분량을 강요하지 않는다. */
        private const val MIN_LENGTH = 1

        fun write(accountId: UUID, questionId: Long, content: String, now: Instant = Instant.now(), selectedOptionIds: List<String> = emptyList()): Answer =
            Answer(null, accountId, questionId, validate(content), now, selectedOptionIds)

        fun reconstitute(
            id: UUID,
            accountId: UUID,
            questionId: Long,
            content: String,
            createdAt: Instant,
            selectedOptionIds: List<String> = emptyList(),
        ): Answer = Answer(id, accountId, questionId, content, createdAt, selectedOptionIds)

        private fun validate(content: String): String {
            val trimmed = content.trim()
            if (trimmed.isBlank()) throw DailyMeetException("답변은 비어 있을 수 없습니다")
            if (trimmed.length < MIN_LENGTH) throw DailyMeetException("조금 더 들려주세요 — ${MIN_LENGTH}자 이상 적어야 해요")
            if (trimmed.length > MAX_LENGTH) throw DailyMeetException("답변은 ${MAX_LENGTH}자 이하여야 합니다")
            return trimmed
        }
    }
}
