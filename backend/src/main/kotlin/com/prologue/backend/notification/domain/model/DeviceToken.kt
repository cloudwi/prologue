package com.prologue.backend.notification.domain.model

import com.prologue.backend.dailymeet.domain.model.StorePlatform
import java.time.Instant
import java.util.UUID

/** 푸시를 받을 기기 하나. 같은 기기로 다른 계정이 로그인하면 소유자가 옮겨간다. */
class DeviceToken private constructor(
    val id: UUID,
    val token: String,
    val platform: StorePlatform,
    val createdAt: Instant,
    accountId: UUID,
    updatedAt: Instant,
) {
    var accountId: UUID = accountId
        private set
    var updatedAt: Instant = updatedAt
        private set

    /** 소유자 이전 — 기기를 물려주거나 계정을 갈아탔을 때 이전 사용자에게 알림이 가지 않게. */
    fun reassignTo(accountId: UUID, now: Instant = Instant.now()) {
        this.accountId = accountId
        this.updatedAt = now
    }

    companion object {
        fun register(accountId: UUID, token: String, platform: StorePlatform, now: Instant = Instant.now()): DeviceToken {
            require(token.isNotBlank()) { "기기 토큰이 비어 있습니다" }
            return DeviceToken(UUID.randomUUID(), token, platform, now, accountId, now)
        }

        fun reconstitute(
            id: UUID,
            accountId: UUID,
            token: String,
            platform: StorePlatform,
            createdAt: Instant,
            updatedAt: Instant,
        ) = DeviceToken(id, token, platform, createdAt, accountId, updatedAt)
    }
}
