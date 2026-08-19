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
    val kind: Kind,
    /** 초대받은 쪽이 받는 잉크. null이면 코드의 기본값([InkPrice.REFERRAL]). */
    val inviteeReward: Int?,
    /** 초대한 쪽이 받는 잉크. null이면 기본값. 특별 코드는 보통 0 — 운영자가 제 코드로 잉크를 벌 이유가 없다. */
    val inviterReward: Int?,
    /** 이 코드를 쓸 수 있는 사람 수 상한. null이면 무제한(개인 코드). */
    val maxUses: Int?,
) {
    /**
     * PERSONAL — 회원마다 하나씩 자동 발급되는 코드. 보상은 기본값, 초대한 쪽은 상한까지만.
     * SPECIAL — 운영자가 만들어 지인·행사에 뿌리는 코드. 보상을 코드에 적고, 초대한 쪽 상한을 타지 않는다.
     */
    enum class Kind { PERSONAL, SPECIAL }

    fun inviteeRewardOrDefault(): Int = inviteeReward ?: InkPrice.REFERRAL
    fun inviterRewardOrDefault(): Int = inviterReward ?: if (kind == Kind.SPECIAL) 0 else InkPrice.REFERRAL

    companion object {
        private const val ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
        const val LENGTH = 6
        const val MIN_LENGTH = 4
        const val MAX_LENGTH = 20
        private val random = SecureRandom()

        fun issue(accountId: UUID, now: Instant = Instant.now()): InviteCode =
            InviteCode(accountId, generate(), now, Kind.PERSONAL, null, null, null)

        /** 운영자가 만드는 특별 코드. 코드 글자는 [normalize]를 거쳐 저장된다. */
        fun special(
            accountId: UUID,
            rawCode: String,
            inviteeReward: Int,
            inviterReward: Int = 0,
            maxUses: Int? = null,
            now: Instant = Instant.now(),
        ): InviteCode {
            val code = normalize(rawCode)
            if (code.length !in MIN_LENGTH..MAX_LENGTH) throw DailyMeetException("초대 코드는 ${MIN_LENGTH}~${MAX_LENGTH}자여야 해요")
            if (!code.all { it in 'A'..'Z' || it in '0'..'9' }) throw DailyMeetException("초대 코드는 영문·숫자만 쓸 수 있어요")
            if (inviteeReward <= 0) throw DailyMeetException("보상 잉크는 0보다 커야 해요")
            return InviteCode(accountId, code, now, Kind.SPECIAL, inviteeReward, inviterReward, maxUses)
        }

        fun reconstitute(
            accountId: UUID,
            code: String,
            createdAt: Instant,
            kind: Kind = Kind.PERSONAL,
            inviteeReward: Int? = null,
            inviterReward: Int? = null,
            maxUses: Int? = null,
        ): InviteCode = InviteCode(accountId, code, createdAt, kind, inviteeReward, inviterReward, maxUses)

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
    /** 어떤 코드로 들어왔는가 — 특별 코드의 사용 횟수를 세는 열쇠. */
    val code: String,
    val createdAt: Instant,
) {
    companion object {
        fun create(inviterAccountId: UUID, inviteeAccountId: UUID, code: String, now: Instant = Instant.now()): Referral {
            if (inviterAccountId == inviteeAccountId) throw DailyMeetException("내 초대 코드는 내가 쓸 수 없어요")
            return Referral(UUID.randomUUID(), inviterAccountId, inviteeAccountId, code, now)
        }

        fun reconstitute(id: UUID, inviterAccountId: UUID, inviteeAccountId: UUID, code: String, createdAt: Instant) =
            Referral(id, inviterAccountId, inviteeAccountId, code, createdAt)
    }
}
