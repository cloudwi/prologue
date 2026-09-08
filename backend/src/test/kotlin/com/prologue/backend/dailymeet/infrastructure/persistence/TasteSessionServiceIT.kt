package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.application.service.*
import com.prologue.backend.dailymeet.domain.model.*
import com.prologue.backend.support.PostgresRepositoryTest
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import java.time.Instant
import java.util.UUID
import kotlin.test.*

@Import(TasteSessionPersistenceAdapter::class, TasteCardPersistenceAdapter::class,
    TasteChoicePersistenceAdapter::class, TasteRewardPersistenceAdapter::class,
    TasteCardService::class, TasteSessionService::class)
class TasteSessionServiceIT : PostgresRepositoryTest() {
    @Autowired lateinit var service: TasteSessionService
    @Autowired lateinit var legacy: TasteCardService
    @Autowired lateinit var rewards: TasteRewardPersistenceAdapter
    @Autowired lateinit var choices: TasteChoicePersistenceAdapter
    @Autowired lateinit var sessions: TasteSessionPersistenceAdapter
    private val me = UUID.randomUUID()
    private val before = Instant.parse("2026-09-08T02:59:00Z")
    private val noon = Instant.parse("2026-09-08T03:00:00Z")

    @Test
    fun `정오 경계에서 미리보기는 기존 묶음을 만료시키지 않고 완료 보상은 한 번만 준다`() {
        val deck = service.start(me, before)
        assertEquals(10, deck.cards.size)
        assertEquals(noon, deck.resetsAt)
        service.choose(me, deck.sessionId!!, deck.cards.first().id, TasteOption.A, null, before)
        assertEquals(0, service.preview(me, noon).answered)
        val restored = service.get(me, deck.sessionId)
        assertEquals(1, restored.answered)
        assertEquals(10, restored.sessionCards.size)
        assertEquals(TasteOption.A, restored.sessionCards.first().myOption)
        assertNull(restored.sessionCards[1].optionPercentages)
        deck.cards.drop(1).forEach { service.choose(me, deck.sessionId, it.id, TasteOption.B, null, noon) }
        assertEquals(1, rewards.pendingCount(me))
        assertFalse(service.choose(me, deck.sessionId, deck.cards.last().id, TasteOption.A, null, noon).milestoneReached)
        assertFalse(legacy.accrueRewards(me))
        assertEquals(1, rewards.pendingCount(me))
        val fresh = service.start(me, noon)
        assertEquals(0, fresh.answered)
        assertTrue(fresh.cards.none { card -> deck.cards.any { it.id == card.id } })
        fresh.cards.forEach { service.choose(me, fresh.sessionId!!, it.id, TasteOption.A, null, noon) }
        assertEquals(2, rewards.pendingCount(me))
        assertEquals(10, service.start(me, noon.plusSeconds(600)).answered)
        assertTrue(service.start(me, noon).cards.isEmpty())
    }

    @Test
    fun `새 묶음은 이전 진행을 합산하지 않고 다른 계정이나 이전 묶음 답변을 거부한다`() {
        val old = service.start(me, before)
        service.choose(me, old.sessionId!!, old.cards.first().id, TasteOption.A, null, before)
        val fresh = service.start(me, noon)
        assertEquals(0, fresh.answered)
        assertFailsWith<DailyMeetException> { service.choose(me, old.sessionId, old.cards[1].id, TasteOption.A, null, noon) }
        assertFailsWith<DailyMeetException> { service.choose(UUID.randomUUID(), fresh.sessionId!!, fresh.cards[0].id, TasteOption.A, null, noon) }
        assertFailsWith<DailyMeetException> { service.choose(me, fresh.sessionId!!, old.cards[0].id, TasteOption.A, null, noon) }
        assertEquals(fresh.sessionId, service.start(me, noon).sessionId)
        assertEquals(0, rewards.pendingCount(me))
    }

    @Test
    fun `통계는 열 명부터 보이고 재선택은 사람 수를 늘리지 않는다`() {
        val deck = service.start(me, noon)
        val id = deck.cards.first().id
        repeat(8) { choices.save(TasteChoice.choose(UUID.randomUUID(), id, TasteOption.A)) }
        assertNull(service.choose(me, deck.sessionId!!, id, TasteOption.B, null, noon).selectedPercentage)
        choices.save(TasteChoice.choose(UUID.randomUUID(), id, TasteOption.B))
        val result = service.choose(me, deck.sessionId, id, TasteOption.B, null, noon)
        assertEquals(20, result.selectedPercentage)
        assertEquals(80, result.optionPercentages!![TasteOption.A])
        assertEquals(20, result.optionPercentages[TasteOption.B])
        assertEquals(0, result.optionPercentages[TasteOption.C])
        assertEquals(90, service.choose(me, deck.sessionId, id, TasteOption.A, null, noon).selectedPercentage)
        assertEquals(10, sessions.statistics(id).values.sum())
        assertEquals(90, service.get(me, deck.sessionId).sessionCards.first().optionPercentages!![TasteOption.A])
        assertEquals(1, service.get(me, deck.sessionId).answered)
    }

    @Test
    fun `이전 누적 보상은 전환 때 보존하고 이후에는 하루 묶음으로만 지급한다`() {
        (1L..10L).forEach { choices.save(TasteChoice.choose(me, it, TasteOption.A)) }
        service.start(me, noon)
        assertEquals(1, rewards.pendingCount(me))
        (11L..20L).forEach { choices.save(TasteChoice.choose(me, it, TasteOption.A)) }
        assertFalse(legacy.accrueRewards(me))
        assertEquals(1, rewards.pendingCount(me))
    }
}
