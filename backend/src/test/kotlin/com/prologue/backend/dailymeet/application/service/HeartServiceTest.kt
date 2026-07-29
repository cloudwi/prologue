package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.Conversation
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.ConversationRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class HeartServiceTest {

    private val answerRepository = mockk<AnswerRepository>()
    private val heartRepository = mockk<HeartRepository>(relaxed = true)
    private val conversationRepository = mockk<ConversationRepository>(relaxed = true)
    private val service = HeartService(answerRepository, heartRepository, conversationRepository)

    private val me = UUID.randomUUID()
    private val peer = UUID.randomUUID()
    private val peerAnswerId = UUID.randomUUID()
    private val peerAnswer = Answer.reconstitute(peerAnswerId, peer, 1L, "상대 답변", Instant.now())

    @Test
    fun `상대 답변이 없으면 예외`() {
        every { answerRepository.findById(peerAnswerId) } returns null

        assertFailsWith<DailyMeetException> { service.heart(me, peerAnswerId) }
    }

    @Test
    fun `내 답변에는 하트할 수 없다`() {
        val mine = Answer.reconstitute(peerAnswerId, me, 1L, "내 답변", Instant.now())
        every { answerRepository.findById(peerAnswerId) } returns mine

        assertFailsWith<DailyMeetException> { service.heart(me, peerAnswerId) }
    }

    @Test
    fun `한쪽만 하트면 호감만 기록되고 대화는 열리지 않는다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns false
        every { heartRepository.existsFromTo(peer, me) } returns false

        val result = service.heart(me, peerAnswerId)

        assertTrue(result.hearted)
        assertFalse(result.matched)
        assertNull(result.conversationId)
        verify { heartRepository.save(any<Heart>()) }
        verify(exactly = 0) { conversationRepository.save(any()) }
    }

    @Test
    fun `서로 하트면 대화가 열린다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns false
        every { heartRepository.existsFromTo(peer, me) } returns true
        every { conversationRepository.findBetween(any(), any()) } returns null
        val conversationId = UUID.randomUUID()
        every { conversationRepository.save(any()) } answers {
            Conversation.reconstitute(conversationId, me, peer, Instant.now())
        }

        val result = service.heart(me, peerAnswerId)

        assertTrue(result.matched)
        assertEquals(conversationId, result.conversationId)
    }

    @Test
    fun `이미 대화가 있으면 그 대화를 돌려준다 - 중복 생성 없음`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns true
        every { heartRepository.existsFromTo(peer, me) } returns true
        val existingId = UUID.randomUUID()
        every { conversationRepository.findBetween(any(), any()) } returns
            Conversation.reconstitute(existingId, me, peer, Instant.now())

        val result = service.heart(me, peerAnswerId)

        assertEquals(existingId, result.conversationId)
        verify(exactly = 0) { conversationRepository.save(any()) }
    }
}
