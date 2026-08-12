package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 잉크를 써서 다시 연 프로필 한 건. 한 번 남기면 고치지 않는다.
 *
 * 같은 (account_id, peer_account_id)는 DB 유니크 제약이 막는다 —
 * 앱이 재시도하거나 두 요청이 같은 순간에 들어와도 잉크가 두 번 나가지 않는다.
 * 중복 지급이 아니라 중복 '차감'이라, 막지 못하면 유저가 손해를 본다.
 */
class ProfileUnlock private constructor(
    val id: UUID,
    val accountId: UUID,
    val peerAccountId: UUID,
    val createdAt: Instant,
) {
    companion object {
        fun open(accountId: UUID, peerAccountId: UUID, now: Instant = Instant.now()): ProfileUnlock {
            require(accountId != peerAccountId) { "자신의 프로필은 열 대상이 아닙니다" }
            return ProfileUnlock(UUID.randomUUID(), accountId, peerAccountId, now)
        }

        fun reconstitute(id: UUID, accountId: UUID, peerAccountId: UUID, createdAt: Instant) =
            ProfileUnlock(id, accountId, peerAccountId, createdAt)
    }
}
