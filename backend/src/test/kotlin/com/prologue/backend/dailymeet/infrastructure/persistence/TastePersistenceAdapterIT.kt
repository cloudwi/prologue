package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.TasteChoice
import com.prologue.backend.dailymeet.domain.model.TasteOption
import com.prologue.backend.support.PostgresRepositoryTest
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

/**
 * 취향 카드 저장소 — 진짜 Postgres에 실제로 쿼리를 던진다.
 *
 * `taste_choices`도 (account_id, card_id)가 `@EmbeddedId`라, 파생 쿼리를 썼다면 이름은 해석되고
 * 기동도 통과한 뒤 **실행 시점에** 터진다(`meetup_follows`에서 겪은 그 함정).
 * 시드된 카드 100장이 마이그레이션으로 실제로 들어오는지도 여기서만 확인된다.
 */
@Import(TasteCardPersistenceAdapter::class, TasteChoicePersistenceAdapter::class)
class TastePersistenceAdapterIT : PostgresRepositoryTest() {

    @Autowired
    private lateinit var cards: TasteCardPersistenceAdapter

    @Autowired
    private lateinit var choices: TasteChoicePersistenceAdapter

    private val me = UUID.randomUUID()
    private val someoneElse = UUID.randomUUID()

    @Test
    fun `카드 더미는 마이그레이션으로 채워져 있고 id 순으로 나온다`() {
        val deck = cards.findAllOrdered()

        assertTrue(deck.size >= 100, "시드 카드가 들어오지 않았다: ${deck.size}장")
        assertEquals(deck.map { it.id }.sorted(), deck.map { it.id })
        assertTrue(deck.all { it.optionA.isNotBlank() && it.optionB.isNotBlank() })
    }

    @Test
    fun `고른 카드는 선택과 한 줄까지 그대로 돌아온다`() {
        choices.save(TasteChoice.choose(me, 1L, TasteOption.A, "새벽이 제일 조용해서요"))

        val saved = choices.findByAccountIdAndCardId(me, 1L)!!

        assertEquals(TasteOption.A, saved.option)
        assertEquals("새벽이 제일 조용해서요", saved.note)
    }

    @Test
    fun `다시 고르면 덮어쓴다 - 한 사람이 한 카드에 두 줄을 남기지 않는다`() {
        choices.save(TasteChoice.choose(me, 2L, TasteOption.A, "처음 생각"))
        choices.save(TasteChoice.choose(me, 2L, TasteOption.B, null))

        val mine = choices.findAllByAccountId(me)

        assertEquals(1, mine.size)
        assertEquals(TasteOption.B, mine.first().option)
        assertNull(mine.first().note)
    }

    @Test
    fun `내 선택과 남의 선택은 섞이지 않는다`() {
        // 복합키의 두 열이 각각 제대로 걸리는지 — 계정 조건이 새면 남의 취향이 내 것으로 들어온다.
        choices.save(TasteChoice.choose(me, 3L, TasteOption.A))
        choices.save(TasteChoice.choose(someoneElse, 3L, TasteOption.B))

        assertEquals(listOf(3L to TasteOption.A), choices.findAllByAccountId(me).map { it.cardId to it.option })
        assertEquals(listOf(3L to TasteOption.B), choices.findAllByAccountId(someoneElse).map { it.cardId to it.option })
    }

    @Test
    fun `여러 사람 몫을 한 번에 읽는다 - 매칭이 사람 수만큼 쿼리를 던지지 않게`() {
        choices.save(TasteChoice.choose(me, 4L, TasteOption.A))
        choices.save(TasteChoice.choose(someoneElse, 5L, TasteOption.B))

        val both = choices.findAllByAccountIds(listOf(me, someoneElse))

        assertEquals(setOf(me, someoneElse), both.map { it.accountId }.toSet())
        assertTrue(choices.findAllByAccountIds(emptyList()).isEmpty())
    }
}
