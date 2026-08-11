package com.prologue.backend.dailymeet.domain.model

import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class QuestionRotationTest {

    private val pool = (1L..5L).map { Question(it, "질문 $it") }

    @Test
    fun `같은 날짜면 언제 물어도 같은 질문이 나온다`() {
        val date = LocalDate.of(2026, 8, 11)

        assertEquals(QuestionRotation.of(pool, date).id, QuestionRotation.of(pool, date).id)
    }

    @Test
    fun `날짜가 하루 지나면 다음 질문으로 넘어간다`() {
        val today = LocalDate.of(2026, 8, 11)

        val a = QuestionRotation.of(pool, today).id
        val b = QuestionRotation.of(pool, today.plusDays(1)).id

        assertEquals(a % pool.size + 1, b) // id는 1부터라 순환하면 +1
    }

    @Test
    fun `질문 수만큼 지나면 한 바퀴 돌아 같은 질문이 된다`() {
        val today = LocalDate.of(2026, 8, 11)

        assertEquals(
            QuestionRotation.of(pool, today).id,
            QuestionRotation.of(pool, today.plusDays(pool.size.toLong())).id,
        )
    }

    @Test
    fun `질문 풀이 비어 있으면 예외`() {
        assertFailsWith<DailyMeetException> { QuestionRotation.of(emptyList(), LocalDate.of(2026, 8, 11)) }
    }

    @Test
    fun `최근 며칠치는 그날들의 질문을 모두 담는다`() {
        val today = LocalDate.of(2026, 8, 11)

        val ids = QuestionRotation.recentIds(pool, today, days = 3)

        assertEquals(3, ids.size)
        assertEquals(QuestionRotation.of(pool, today).id, ids.first())
        assertTrue(QuestionRotation.of(pool, today.minusDays(2)).id in ids)
    }

    @Test
    fun `범위가 질문 수를 넘어도 중복 없이 돌려준다`() {
        val ids = QuestionRotation.recentIds(pool, LocalDate.of(2026, 8, 11), days = 12)

        assertEquals(pool.size, ids.size)
        assertEquals(ids.size, ids.distinct().size)
    }

    @Test
    fun `범위가 0이하여도 최소 하루치는 본다`() {
        val ids = QuestionRotation.recentIds(pool, LocalDate.of(2026, 8, 11), days = 0)

        assertEquals(1, ids.size)
    }
}
