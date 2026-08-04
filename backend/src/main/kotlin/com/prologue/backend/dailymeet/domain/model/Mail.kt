package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 편지 — 인앱 채팅 대신 연락처를 건네는 한 통.
 * 내용(최대 300자)과 함께 전화번호/카카오톡 ID 중 하나 이상을 반드시 싣는다.
 * 받은 사람에게 연락처가 바로 보이며, 그 뒤의 대화는 앱 밖에서 이어진다.
 */
class Mail private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val senderAccountId: UUID,
    val recipientAccountId: UUID,
    val content: String,
    val phone: String?,
    val kakaoId: String?,
    val createdAt: Instant,
) {
    companion object {
        private const val MAX_LENGTH = 300 // 편지 한 통의 분량 — 대화가 아니라 건네는 인사

        fun write(
            senderAccountId: UUID,
            recipientAccountId: UUID,
            content: String,
            phone: String?,
            kakaoId: String?,
            now: Instant = Instant.now(),
        ): Mail {
            val trimmed = content.trim()
            if (trimmed.isBlank()) throw DailyMeetException("편지 내용을 적어주세요")
            if (trimmed.length > MAX_LENGTH) throw DailyMeetException("편지는 ${MAX_LENGTH}자 이하여야 해요")
            val kakao = kakaoId?.trim()?.ifBlank { null }
            if (phone == null && kakao == null) {
                throw DailyMeetException("전화번호나 카카오톡 ID 중 하나는 함께 보내야 해요")
            }
            return Mail(null, senderAccountId, recipientAccountId, trimmed, phone, kakao, now)
        }

        fun reconstitute(
            id: UUID,
            senderAccountId: UUID,
            recipientAccountId: UUID,
            content: String,
            phone: String?,
            kakaoId: String?,
            createdAt: Instant,
        ): Mail = Mail(id, senderAccountId, recipientAccountId, content, phone, kakaoId, createdAt)
    }
}
