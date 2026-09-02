package com.prologue.backend.dailymeet.domain.model

import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class TasteChoiceTest {

    private val accountId = UUID.randomUUID()

    @Test
    fun `한 줄은 없어도 된다`() {
        // 카드의 존재 이유가 "부담 없이 시작하는 것"이라, 한 줄을 강제하면 백지가 작아졌을 뿐이다.
        val choice = TasteChoice.choose(accountId, 1L, TasteOption.A)

        assertNull(choice.note)
    }

    @Test
    fun `공백만 있는 한 줄은 없는 것과 같다`() {
        assertNull(TasteChoice.choose(accountId, 1L, TasteOption.A, "   ").note)
    }

    @Test
    fun `한 줄은 앞뒤 공백을 털어 저장한다`() {
        assertEquals("밤이 더 좋아요", TasteChoice.choose(accountId, 1L, TasteOption.B, "  밤이 더 좋아요 ").note)
    }

    @Test
    fun `한 줄이 길면 막는다`() {
        assertFailsWith<DailyMeetException> {
            TasteChoice.choose(accountId, 1L, TasteOption.A, "가".repeat(TasteChoice.NOTE_MAX_LENGTH + 1))
        }
    }

    @Test
    fun `다시 고르면 선택과 한 줄이 함께 바뀐다`() {
        val choice = TasteChoice.choose(accountId, 1L, TasteOption.A, "아침형이에요")

        choice.revise(TasteOption.B, null)

        assertEquals(TasteOption.B, choice.option)
        assertNull(choice.note)
    }
}
