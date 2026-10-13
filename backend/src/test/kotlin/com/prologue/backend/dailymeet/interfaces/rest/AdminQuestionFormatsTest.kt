package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.domain.model.*
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class AdminQuestionFormatsTest {
    private val repository = mockk<QuestionRepository>()
    private val controller = AdminQuestionController(repository)
    private val options = listOf(QuestionOption("A", "산책"), QuestionOption("B", "영화"))

    @Test
    fun `관리자 문구 수정은 형식과 선택지를 보존한다`() {
        every { repository.findAllOrdered() } returns listOf(Question(1,"어디에 가고 싶나요?",QuestionInputType.SINGLE_CHOICE,options))
        val saved = slot<Question>()
        every { repository.save(capture(saved)) } answers { saved.captured }
        val result = controller.edit(1,QuestionRequest(" 함께 무엇을 하고 싶나요? "))
        assertEquals(QuestionInputType.SINGLE_CHOICE,result.inputType)
        assertEquals(options,result.options)
        assertEquals("함께 무엇을 하고 싶나요?",saved.captured.content)
    }

    @Test
    fun `이미 있는 질문의 선택지는 덮어쓰지 않는다`() {
        every { repository.findAllOrdered() } returns listOf(Question(1,"무엇을 하고 싶나요?",QuestionInputType.SINGLE_CHOICE,options))
        assertFailsWith<DailyMeetException> { controller.edit(1,QuestionRequest("무엇을 하고 싶나요?",options=options.reversed())) }
        verify(exactly=0) { repository.save(any()) }
    }
}
