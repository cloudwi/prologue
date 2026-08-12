package com.prologue.backend.notification.domain.repository

import com.prologue.backend.notification.domain.model.DeviceToken
import java.util.UUID

interface DeviceTokenRepository {
    fun findByToken(token: String): DeviceToken?
    fun findAllByAccountId(accountId: UUID): List<DeviceToken>
    fun save(token: DeviceToken): DeviceToken
    fun deleteByToken(token: String)
    fun deleteAllByAccountId(accountId: UUID)
    /** 알림을 받을 수 있는 모든 기기 — 매일 보내는 안내에 쓴다. */
    fun findAllTokens(): List<String>
}
