package com.prologue.backend.dailymeet.domain.model

import java.time.Duration
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ProfileAccessTest {

    private val now: Instant = Instant.parse("2026-08-12T12:00:00Z")

    @Test
    fun `사흘 안이면 열려 있다`() {
        val pairedAt = now.minus(Duration.ofDays(2))

        assertTrue(ProfileAccess.isOpen(pairedAt, unlocked = false, now = now))
    }

    @Test
    fun `사흘이 지나면 닫힌다`() {
        val pairedAt = now.minus(Duration.ofDays(3)).minusSeconds(1)

        assertFalse(ProfileAccess.isOpen(pairedAt, unlocked = false, now = now))
    }

    @Test
    fun `정확히 사흘째에 닫힌다`() {
        // 경계는 한쪽으로 정해둬야 한다 — "사흘 동안"은 사흘째가 되는 순간까지다.
        assertFalse(ProfileAccess.isOpen(now.minus(ProfileAccess.WINDOW), unlocked = false, now = now))
    }

    @Test
    fun `우표로 열었으면 아무리 오래돼도 열려 있다`() {
        // 한 번 산 것을 다시 닫으면 값을 받은 게 아니라 볼모로 잡은 것이다.
        val longAgo = now.minus(Duration.ofDays(365))

        assertTrue(ProfileAccess.isOpen(longAgo, unlocked = true, now = now))
    }

    @Test
    fun `이어진 적 없는 상대는 열리지 않는다`() {
        // 소개도 하트도 없었다면 볼 자격 자체가 없다 — 우표로도 열 수 없어야 한다.
        assertFalse(ProfileAccess.isOpen(null, unlocked = false, now = now))
    }
}
