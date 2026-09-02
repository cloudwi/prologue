package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.support.PostgresRepositoryTest
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

/**
 * 추가 소개권 저장소 — 진짜 Postgres에 실제로 쿼리를 던진다(V63).
 *
 * (계정, 이정표)가 @EmbeddedId라 파생 쿼리를 썼다면 실행 시점에 터진다. 그리고 여기서 막는 것은
 * 같은 이정표를 두 번 받는 일이라, 놓치면 카드를 지웠다 다시 고르는 식으로 소개가 무한히 나온다.
 */
@Import(TasteRewardPersistenceAdapter::class)
class TasteRewardPersistenceAdapterIT : PostgresRepositoryTest() {

    @Autowired
    private lateinit var rewards: TasteRewardPersistenceAdapter

    private val me = UUID.randomUUID()
    private val someoneElse = UUID.randomUUID()

    @Test
    fun `같은 이정표는 한 번만 적립된다`() {
        assertTrue(rewards.claimIfNew(me, 10))
        assertFalse(rewards.claimIfNew(me, 10))

        assertEquals(1, rewards.pendingCount(me))
    }

    @Test
    fun `이정표가 다르면 따로 쌓인다`() {
        rewards.claimIfNew(me, 30)
        rewards.claimIfNew(me, 60)

        assertEquals(2, rewards.pendingCount(me))
    }

    @Test
    fun `쓴 표는 남은 수에서 빠진다`() {
        rewards.claimIfNew(me, 10)
        rewards.claimIfNew(me, 30)

        rewards.markGranted(me, 1)

        assertEquals(1, rewards.pendingCount(me))
    }

    @Test
    fun `남은 것보다 많이 써도 음수가 되지 않는다`() {
        // 후보가 표보다 많이 채워지는 일은 없어야 하지만, 셈이 어긋나도 표가 마이너스로 가면 안 된다.
        rewards.claimIfNew(me, 10)

        rewards.markGranted(me, 5)

        assertEquals(0, rewards.pendingCount(me))
    }

    @Test
    fun `오늘 적립한 표만 하루치로 센다`() {
        // 하루 상한을 재는 자 — 어제 받은 표까지 세면 오늘 아무것도 못 받는다.
        rewards.claimIfNew(me, 10)

        assertEquals(1, rewards.claimedSince(me, java.time.Instant.now().minusSeconds(60)))
        assertEquals(0, rewards.claimedSince(me, java.time.Instant.now().plusSeconds(60)))
    }

    @Test
    fun `남의 표는 내 것이 아니다`() {
        rewards.claimIfNew(someoneElse, 10)

        assertEquals(0, rewards.pendingCount(me))
        assertEquals(1, rewards.pendingCount(someoneElse))
    }
}
