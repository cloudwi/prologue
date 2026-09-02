package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.AnswerUnlock
import com.prologue.backend.support.PostgresRepositoryTest
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

/**
 * 문답 열람권 저장소 — 진짜 Postgres에 실제로 쿼리를 던진다.
 *
 * 여기서 유니크 제약이 막는 것은 중복 '차감'이라, 놓치면 유저가 잉크를 두 번 잃는다.
 * 그 자물쇠가 실제로 걸리는지는 진짜 DB에서만 확인된다(V61).
 */
@Import(AnswerUnlockPersistenceAdapter::class)
class AnswerUnlockPersistenceAdapterIT : PostgresRepositoryTest() {

    @Autowired
    private lateinit var unlocks: AnswerUnlockPersistenceAdapter

    private val me = UUID.randomUUID()
    private val someoneElse = UUID.randomUUID()

    @Test
    fun `처음 사면 열리고 두 번째는 열리지 않는다`() {
        assertTrue(unlocks.saveIfNew(AnswerUnlock.open(me, 1L)))
        assertFalse(unlocks.saveIfNew(AnswerUnlock.open(me, 1L)))

        assertEquals(setOf(1L), unlocks.findQuestionIds(me))
    }

    @Test
    fun `질문이 다르면 따로 산다`() {
        unlocks.saveIfNew(AnswerUnlock.open(me, 2L))
        unlocks.saveIfNew(AnswerUnlock.open(me, 3L))

        assertEquals(setOf(2L, 3L), unlocks.findQuestionIds(me))
    }

    @Test
    fun `남이 산 열람권은 내 것이 아니다`() {
        unlocks.saveIfNew(AnswerUnlock.open(someoneElse, 4L))

        assertFalse(4L in unlocks.findQuestionIds(me))
        assertEquals(setOf(4L), unlocks.findQuestionIds(someoneElse))
    }
}
