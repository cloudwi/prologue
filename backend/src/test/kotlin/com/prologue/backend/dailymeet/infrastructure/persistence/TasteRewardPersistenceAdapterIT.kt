package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.TasteReward.EVERY
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

    @Autowired
    private lateinit var transactions: org.springframework.transaction.PlatformTransactionManager

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
    @Test
    fun `한 벌 경계에 딱 맞지 않아도 누락 이정표를 적립한다`() {
        val since = java.time.Instant.now().minusSeconds(60)
        val answered = EVERY * 2 + 1 // 두 벌을 채우고 한 장이 더 있는 상태
        assertTrue(rewards.claimEarned(me, answered, since, 1))
        assertEquals(listOf(EVERY), rewards.claimedMilestones(me))
        assertFalse(rewards.claimEarned(me, answered, since, 1))
        // 새 서비스 날짜를 모사한다. 이미 받은 이정표는 건너뛴다.
        assertTrue(rewards.claimEarned(me, answered, java.time.Instant.now().plusSeconds(60), 1))
        assertEquals(setOf(EVERY, EVERY * 2), rewards.claimedMilestones(me).toSet())
        assertFalse(rewards.claimEarned(me, answered, java.time.Instant.now().plusSeconds(60), 1))
    }

    @Test
    fun `한 벌을 채우기 전에는 보상을 만들지 않는다`() {
        assertFalse(rewards.claimEarned(me, EVERY - 1, java.time.Instant.now().minusSeconds(60), 1))
        assertEquals(0, rewards.pendingCount(me))
    }

    @Test
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    fun `동시 수령 요청도 하루 한 장만 적립한다`() {
        val executor = java.util.concurrent.Executors.newFixedThreadPool(2)
        val ready = java.util.concurrent.CountDownLatch(2)
        val go = java.util.concurrent.CountDownLatch(1)
        val tx = org.springframework.transaction.support.TransactionTemplate(transactions)
        val since = java.time.Instant.now().minusSeconds(60)
        try {
            val tasks = (1..2).map {
                executor.submit<Boolean> {
                    ready.countDown()
                    check(go.await(10, java.util.concurrent.TimeUnit.SECONDS))
                    tx.execute { rewards.claimEarned(me, 30, since, 1) }!!
                }
            }
            assertTrue(ready.await(10, java.util.concurrent.TimeUnit.SECONDS))
            go.countDown()
            assertEquals(1, tasks.count { it.get(15, java.util.concurrent.TimeUnit.SECONDS) })
            assertEquals(1, rewards.pendingCount(me))
        } finally {
            go.countDown()
            executor.shutdownNow()
        }
    }

    @Test
    fun `하루 제한 없이 여러 달성을 기록하고 실제 소개한 수만 센다`() {
        val since = java.time.Instant.now().minusSeconds(60)
        assertTrue(rewards.claimEarned(me, EVERY * 2, since, Int.MAX_VALUE))
        assertTrue(rewards.claimEarned(me, EVERY * 2, since, Int.MAX_VALUE))
        assertFalse(rewards.claimEarned(me, EVERY * 2, since, Int.MAX_VALUE))
        assertEquals(0, rewards.grantedSince(me, since))
        rewards.markGranted(me, 1)
        assertEquals(1, rewards.grantedSince(me, since))
        assertEquals(1, rewards.pendingCount(me))
    }

}
