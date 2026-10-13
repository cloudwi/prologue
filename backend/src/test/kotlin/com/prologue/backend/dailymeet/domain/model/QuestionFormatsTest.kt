package com.prologue.backend.dailymeet.domain.model

import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class QuestionFormatsTest {
    private val options = listOf(QuestionOption("A", "산책"), QuestionOption("B", "영화"), QuestionOption("C", "요리"))

    @Test
    fun `OX 답변은 글을 덧붙이지 않아도 저장 가능한 문구가 된다`() {
        val question = Question(1, "산책을 좋아하나요?", QuestionInputType.OX, listOf(QuestionOption("O", "맞아요"), QuestionOption("X", "아니에요")))
        assertEquals(listOf("O") to "O · 맞아요", question.selection(listOf("O")))
    }

    @Test
    fun `복수 선택은 등록 순서로 저장하고 중복과 모르는 선택지를 거절한다`() {
        val question = Question(1, "함께 무엇을 하고 싶나요?", QuestionInputType.MULTIPLE_CHOICE, options)
        assertEquals(listOf("A", "C") to "산책 · 요리", question.selection(listOf("C", "A")))
        for (ids in listOf(emptyList(), listOf("A", "A"), listOf("D"))) {
            assertFailsWith<DailyMeetException> { question.selection(ids) }
        }
    }

    @Test
    fun `단일 선택에는 한 개만 고를 수 있고 주관식에는 선택지를 제출할 수 없다`() {
        assertFailsWith<DailyMeetException> { Question(1, "무엇이 좋나요?", QuestionInputType.SINGLE_CHOICE, options).selection(listOf("A", "B")) }
        assertFailsWith<DailyMeetException> { Question(1, "오늘은 어떤가요?").selection(listOf("A")) }
    }

    @Test
    fun `주관식 한 단어는 허용하고 공백만 있는 답은 거절한다`() {
        val account = java.util.UUID.randomUUID()
        assertEquals("차", Answer.write(account, 1, " 차 ").content)
        assertEquals("차", ProfileLetter.write(account, 1, " 차 ").content)
        assertFailsWith<DailyMeetException> { Answer.write(account, 1, "  ") }
    }

    @Test
    fun `열흘 동안 네 형식을 섞고 최근 후보 질문도 같은 순환을 쓴다`() {
        val pool = (1L..20L).flatMap { id ->
            listOf(
                Question(id, "주관식 $id"),
                Question(100+id, "OX $id", QuestionInputType.OX, listOf(QuestionOption("O", "맞아요"), QuestionOption("X", "아니에요"))),
                Question(200+id, "단일 $id", QuestionInputType.SINGLE_CHOICE, options),
                Question(300+id, "복수 $id", QuestionInputType.MULTIPLE_CHOICE, options),
            )
        }
        val date = LocalDate.of(2026, 10, 13)
        val days = (0L..9L).map { date.plusDays(it) }
        val chosen = days.map { QuestionRotation.of(pool, it) }
        assertEquals(mapOf(QuestionInputType.OX to 3, QuestionInputType.SINGLE_CHOICE to 3, QuestionInputType.MULTIPLE_CHOICE to 2, QuestionInputType.TEXT to 2), chosen.groupingBy { it.inputType }.eachCount())
        assertEquals(10, chosen.map { it.id }.distinct().size)
        val recent = QuestionRotation.recentIds(pool, days.last(), 10)
        assertEquals(chosen.map { it.id }.reversed(), recent)
        assertTrue(chosen.zipWithNext().none { (a,b) -> a.inputType == QuestionInputType.TEXT && b.inputType == QuestionInputType.TEXT })
    }
}
