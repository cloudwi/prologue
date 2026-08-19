package com.prologue.backend.dailymeet.domain.model

import java.security.SecureRandom
import java.time.Instant
import java.util.UUID

/**
 * 내 초대 코드 — 계정당 하나, 처음 물을 때 만들어 두고 바꾸지 않는다.
 * 6자리, 헷갈리는 글자(0·O·1·I·L)는 뺀 알파벳·숫자. 말로 불러주고 받아 적을 수 있어야 한다.
 */
class InviteCode private constructor(
    val accountId: UUID,
    val code: String,
    val createdAt: Instant,
) {
    companion object {
        private const val ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
        const val LENGTH = 6
        private val random = SecureRandom()

        fun issue(accountId: UUID, now: Instant = Instant.now()): InviteCode =
            InviteCode(accountId, generate(), now)

        fun reconstitute(accountId: UUID, code: String, createdAt: Instant): InviteCode = InviteCode(accountId, code, createdAt)

        fun generate(): String = buildString(LENGTH) { repeat(LENGTH) { append(ALPHABET[random.nextInt(ALPHABET.length)]) } }

        /** 입력을 코드 모양으로 고른다 — 소문자·공백·하이픈은 사람이 흔히 섞어 쓴다. */
        fun normalize(raw: String): String = raw.trim().uppercase().replace("-", "").replace(" ", "")
    }
}

/**
 * 초대 한 건 — 누가(inviter) 누구를(invitee) 데려왔는가. 한번 남기면 고치지 않는다.
 * 같은 invitee는 DB 유니크 제약이 막는다 — 코드는 한 사람이 한 번만 쓸 수 있다.
 */
class Referral private constructor(
    val id: UUID,
    val inviterAccountId: UUID,
    val inviteeAccountId: UUID,
    val createdAt: Instant,
) {
    companion object {
        fun create(inviterAccountId: UUID, inviteeAccountId: UUID, now: Instant = Instant.now()): Referral {
            if (inviterAccountId == inviteeAccountId) throw DailyMeetException("내 초대 코드는 내가 쓸 수 없어요")
            return Referral(UUID.randomUUID(), inviterAccountId, inviteeAccountId, now)
        }

        fun reconstitute(id: UUID, inviterAccountId: UUID, inviteeAccountId: UUID, createdAt: Instant) =
            Referral(id, inviterAccountId, inviteeAccountId, createdAt)
    }
}
