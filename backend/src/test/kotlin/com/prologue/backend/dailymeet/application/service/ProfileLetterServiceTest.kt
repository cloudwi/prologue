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
    private val questions = (1L..(ProfileLetter.MAX_PER_MEMBER + 1L)).map { Question(it, "질문 $it") }

    /** 상한을 꽉 채운 편지들 — 개수가 바뀌어도 테스트가 따라간다. */
    private fun fullInbox() = (1L..ProfileLetter.MAX_PER_MEMBER.toLong()).map { letter(it) }

    private fun letter(questionId: Long, content: String = "내용") =
        ProfileLetter.reconstitute(UUID.randomUUID(), accountId, questionId, content, java.time.Instant.now(), java.time.Instant.now())

    @Test
    fun `새 질문이면 편지를 추가한다`() {
        every { questionRepository.findAllOrdered() } returns questions
        every { profileLetterRepository.findByAccountIdAndQuestionId(accountId, 1) } returns null
        every { profileLetterRepository.findAllByAccountId(accountId) } returns emptyList()
        val saved = slot<ProfileLetter>()
        every { profileLetterRepository.save(capture(saved)) } answers { saved.captured }

        service.write(accountId, 1, "  저는 이런 사람이에요. 주말엔 산책을 좋아해요  ")

        assertEquals("저는 이런 사람이에요. 주말엔 산책을 좋아해요", saved.captured.content)
        assertEquals(1, saved.captured.questionId)
    }

    @Test
    fun `같은 질문이면 내용만 고친다 - 개수 상한과 무관`() {
        every { questionRepository.findAllOrdered() } returns questions
        val existing = letter(1, "옛 내용")
        every { profileLetterRepository.findByAccountIdAndQuestionId(accountId, 1) } returns existing
        every { profileLetterRepository.findAllByAccountId(accountId) } returns listOf(existing) + fullInbox().drop(1)
        every { profileLetterRepository.save(any()) } answers { firstArg() }

        service.write(accountId, 1, "새로 고쳐 쓴 내용은 이만큼 길다")

        verify { profileLetterRepository.save(match { it.content == "새로 고쳐 쓴 내용은 이만큼 길다" }) }
    }

    @Test
    fun `상한을 채웠으면 새 질문 편지는 거절한다`() {
        val overflowQid = ProfileLetter.MAX_PER_MEMBER + 1L
        every { questionRepository.findAllOrdered() } returns questions
        every { profileLetterRepository.findByAccountIdAndQuestionId(accountId, overflowQid) } returns null
        every { profileLetterRepository.findAllByAccountId(accountId) } returns fullInbox()

        val e = assertFailsWith<DailyMeetException> { service.write(accountId, overflowQid, "한 통 더") }
        assertEquals("편지는 최대 ${ProfileLetter.MAX_PER_MEMBER}통까지 쓸 수 있어요", e.message)
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

        assertEquals(listOf(ProfileLetterView(2, "질문 2", "답변")), views)
    }
}
