package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * 자리와 대기 줄 — 모임장이 오픈채팅에서 손으로 세던 것을 서버가 세게 만든 규칙.
 *
 * 지금까지 확정에는 정원 검사가 아예 없었다. 여덟 자리 모임에 스무 명을 확정해도 서버는
 * 아무 말도 하지 않았고, 넘친 사실은 당일 현장에서 드러났다.
 */
class MeetupSeatsTest {

    private fun meetup(
        capacity: Int = 8,
        capacityMale: Int? = null,
        capacityFemale: Int? = null,
        waitlistCapacity: Int? = null,
    ) = Meetup.create(
        hostAccountId = UUID.randomUUID(),
        title = "밑줄 모임",
        description = null,
        meetAt = Instant.now().plus(7, ChronoUnit.DAYS),
        place = "서로서가",
        placeUrl = null,
        placeAddress = null,
        capacity = capacity,
        capacityMale = capacityMale,
        capacityFemale = capacityFemale,
        waitlistCapacity = waitlistCapacity,
        fee = 0,
        feeFemale = null,
        genderLimit = null,
        minAgeMale = null,
        maxAgeMale = null,
        minAgeFemale = null,
        maxAgeFemale = null,
        minHeightMaleCm = null,
        minHeightFemaleCm = null,
        requireJobVerified = false,
        emoji = null,
        color = null,
        coverUrls = emptyList(),
        kakaoLink = "https://open.kakao.com/o/abc",
    )

    // ── 나눈 자리 ──

    @Test
    fun `한쪽 정원만 정하는 건 정원이 아니라 소원이다`() {
        val e = assertFailsWith<DailyMeetException> { meetup(capacityMale = 4) }
        assertEquals("성별로 나눈 정원은 남성·여성 모두 정해야 해요", e.message)
    }

    @Test
    fun `나눈 정원의 합이 전체와 다르면 어느 쪽을 믿을지 정할 수 없다`() {
        assertFailsWith<DailyMeetException> { meetup(capacity = 8, capacityMale = 4, capacityFemale = 3) }
    }

    @Test
    fun `나누지 않은 모임은 통합 정원을 그대로 쓴다`() {
        val m = meetup(capacity = 8)
        assertFalse(m.hasSplitSeats())
        assertEquals(8, m.seatsFor("MALE"))
        assertEquals(8, m.seatsFor(null))
    }

    @Test
    fun `나눈 모임은 성별마다 제 자리 수를 가진다`() {
        val m = meetup(capacity = 7, capacityMale = 3, capacityFemale = 4)
        assertTrue(m.hasSplitSeats())
        assertEquals(3, m.seatsFor("MALE"))
        assertEquals(4, m.seatsFor("FEMALE"))
    }

    // ── 확정 ──

    @Test
    fun `자리가 남아 있으면 확정할 수 있다`() {
        meetup(capacity = 8).checkCanConfirm(confirmedInSameSeat = 7, gender = "MALE")
    }

    @Test
    fun `자리가 다 차면 확정할 수 없다 - 넘친 걸 당일에 알면 늦다`() {
        val e = assertFailsWith<DailyMeetException> {
            meetup(capacity = 8).checkCanConfirm(confirmedInSameSeat = 8, gender = "MALE")
        }
        assertTrue(e.message!!.contains("자리가 모두 찼어요"))
    }

    @Test
    fun `나눈 모임에서는 성별 자리만 본다`() {
        val m = meetup(capacity = 8, capacityMale = 4, capacityFemale = 4)
        // 남성 자리는 찼지만 여성 자리는 비어 있다 — 통합으로 셌다면 둘 다 막혔을 것이다.
        assertFailsWith<DailyMeetException> { m.checkCanConfirm(confirmedInSameSeat = 4, gender = "MALE") }
        m.checkCanConfirm(confirmedInSameSeat = 3, gender = "FEMALE")
    }

    @Test
    fun `나눈 모임에 성별 없는 회원은 앉힐 자리가 없다`() {
        val m = meetup(capacity = 8, capacityMale = 4, capacityFemale = 4)
        assertFailsWith<DailyMeetException> { m.checkCanConfirm(confirmedInSameSeat = 0, gender = null) }
    }

    // ── 대기 줄 ──

    @Test
    fun `대기 제한이 없으면 얼마든지 손들 수 있다`() {
        meetup(waitlistCapacity = null).checkCanApply(waiting = 300)
    }

    @Test
    fun `대기 줄이 가득 차면 더 받지 않는다`() {
        val m = meetup(waitlistCapacity = 10)
        m.checkCanApply(waiting = 9)
        val e = assertFailsWith<DailyMeetException> { m.checkCanApply(waiting = 10) }
        assertTrue(e.message!!.contains("대기가 가득"))
    }

    @Test
    fun `대기 인원은 200명까지만 정할 수 있다`() {
        assertFailsWith<DailyMeetException> { meetup(waitlistCapacity = 201) }
        assertFailsWith<DailyMeetException> { meetup(waitlistCapacity = -1) }
    }
}
