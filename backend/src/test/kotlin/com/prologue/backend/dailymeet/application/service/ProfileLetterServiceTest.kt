package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.ProfileLetter
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.repository.ProfileLetterRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ProfileLetterServiceTest {

    private val profileLetterRepository = mockk<ProfileLetterRepository>(relaxed = true)
    private val questionRepository = mockk<QuestionRepository>()
    private val service = ProfileLetterService(profileLetterRepository, questionRepository)

    private val accountId = UUID.randomUUID()
    private val questions = listOf(Question(1, "질문 하나"), Question(2, "질문 둘"), Question(3, "질문 셋"), Question(4, "질문 넷"))

    private fun letter(questionId: Long, content: String = "내용") =
        ProfileLetter.reconstitute(UUID.randomUUID(), accountId, questionId, content, java.time.Instant.now(), java.time.Instant.now())

    @Test
    fun `새 질문이면 편지를 추가한다`() {
        every { questionRepository.findAllOrdered() } returns questions
        every { profileLetterRepository.findByAccountIdAndQuestionId(accountId, 1) } returns null
        every { profileLetterRepository.findAllByAccountId(accountId) } returns emptyList()
        val saved = slot<ProfileLetter>()
        every { profileLetterRepository.save(capture(saved)) } answers { saved.captured }

        service.write(accountId, 1, "  저는 이런 사람이에요  ")

        assertEquals("저는 이런 사람이에요", saved.captured.content)
        assertEquals(1, saved.captured.questionId)
    }

    @Test
    fun `같은 질문이면 내용만 고친다 - 개수 상한과 무관`() {
        every { questionRepository.findAllOrdered() } returns questions
        val existing = letter(1, "옛 내용")
        every { profileLetterRepository.findByAccountIdAndQuestionId(accountId, 1) } returns existing
        every { profileLetterRepository.findAllByAccountId(accountId) } returns listOf(existing, letter(2), letter(3))
        every { profileLetterRepository.save(any()) } answers { firstArg() }

        service.write(accountId, 1, "새 내용")

        verify { profileLetterRepository.save(match { it.content == "새 내용" }) }
    }

    @Test
    fun `이미 3통이면 새 질문 편지는 거절한다`() {
        every { questionRepository.findAllOrdered() } returns questions
        every { profileLetterRepository.findByAccountIdAndQuestionId(accountId, 4) } returns null
        every { profileLetterRepository.findAllByAccountId(accountId) } returns listOf(letter(1), letter(2), letter(3))

        val e = assertFailsWith<DailyMeetException> { service.write(accountId, 4, "네 번째") }
        assertEquals("편지는 최대 3통까지 쓸 수 있어요", e.message)
    }

    @Test
    fun `400자를 넘으면 거절한다`() {
        every { questionRepository.findAllOrdered() } returns questions
        every { profileLetterRepository.findByAccountIdAndQuestionId(accountId, 1) } returns null
        every { profileLetterRepository.findAllByAccountId(accountId) } returns emptyList()

        assertFailsWith<DailyMeetException> { service.write(accountId, 1, "가".repeat(401)) }
    }

    @Test
    fun `없는 질문이면 거절한다`() {
        every { questionRepository.findAllOrdered() } returns questions

        assertFailsWith<DailyMeetException> { service.write(accountId, 99, "내용") }
    }

    @Test
    fun `목록은 질문 원문과 함께 돌려준다`() {
        every { questionRepository.findAllOrdered() } returns questions
        every { profileLetterRepository.findAllByAccountId(accountId) } returns listOf(letter(2, "답변"))

        val views = service.myLetters(accountId)

        assertEquals(listOf(ProfileLetterView(2, "질문 둘", "답변")), views)
    }
}
