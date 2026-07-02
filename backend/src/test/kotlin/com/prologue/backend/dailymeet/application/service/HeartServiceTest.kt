package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class HeartServiceTest {

    private val answerRepository = mockk<AnswerRepository>()
    private val heartRepository = mockk<HeartRepository>(relaxed = true)
    private val service = HeartService(answerRepository, heartRepository)

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
    fun `하트를 보내면 호감이 기록된다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns false

        val result = service.heart(me, peerAnswerId)

        assertTrue(result.hearted)
        verify { heartRepository.save(any<Heart>()) }
    }

    @Test
    fun `이미 하트했으면 중복 저장하지 않는다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns true

        service.heart(me, peerAnswerId)

        verify(exactly = 0) { heartRepository.save(any()) }
    }
}
