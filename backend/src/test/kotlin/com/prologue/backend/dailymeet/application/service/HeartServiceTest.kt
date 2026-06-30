package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Answer
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.model.Match
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MatchRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class HeartServiceTest {

    private val answerRepository = mockk<AnswerRepository>()
    private val heartRepository = mockk<HeartRepository>(relaxed = true)
    private val matchRepository = mockk<MatchRepository>(relaxed = true)
    private val service = HeartService(answerRepository, heartRepository, matchRepository)

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
    fun `상대가 아직 하트 안 했으면 매칭 아님`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns false
        every { heartRepository.exists(peer, me, 1L) } returns false

        val result = service.heart(me, peerAnswerId)

        assertFalse(result.matched)
        verify { heartRepository.save(any<Heart>()) }
        verify(exactly = 0) { matchRepository.save(any()) }
    }

    @Test
    fun `상대도 하트했으면 매칭 성립`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns false
        every { heartRepository.exists(peer, me, 1L) } returns true
        every { matchRepository.exists(any(), any(), eq(1L)) } returns false

        val result = service.heart(me, peerAnswerId)

        assertTrue(result.matched)
        verify { matchRepository.save(any<Match>()) }
    }

    @Test
    fun `이미 하트했으면 중복 저장하지 않는다`() {
        every { answerRepository.findById(peerAnswerId) } returns peerAnswer
        every { heartRepository.exists(me, peer, 1L) } returns true
        every { heartRepository.exists(peer, me, 1L) } returns false

        service.heart(me, peerAnswerId)

        verify(exactly = 0) { heartRepository.save(any()) }
    }
}
