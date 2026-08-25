package com.prologue.backend.dailymeet.domain.model

import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * 개최 완료 — 모임장의 공개 기록(개최 횟수)이 되는 순간.
 *
 * 그 숫자는 초대장과 모임장 프로필에 신뢰 신호로 걸린다. 개설을 모두에게 열면
 * 조작 가능한 지표가 되므로, 열기 전에 조건을 못 박아 둔다.
 */
class MeetupCompleteTest {

    private fun meetup(meetAt: Instant): Meetup = Meetup.reconstitute(
        id = UUID.randomUUID(),
        seriesId = UUID.randomUUID(),
        hostAccountId = UUID.randomUUID(),
        title = "밑줄 모임",
        description = null,
        meetAt = meetAt,
        place = "서울 서초구 언남길 49",
        placeUrl = null,
        placeAddress = "서울 서초구 언남길 49",
        capacity = 8,
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
        status = MeetupStatus.CLOSED,
        createdAt = Instant.now(),
    )

    private val past = Instant.now().minus(Duration.ofDays(1))
    private val future = Instant.now().plus(Duration.ofDays(1))

    @Test
    fun `시각이 지났고 확정 참가자가 있으면 개최로 남는다`() {
        val m = meetup(past)

        m.complete(confirmedCount = 2)

        assertEquals(MeetupStatus.DONE, m.status)
    }

    @Test
    fun `아무도 확정되지 않은 자리는 개최로 남길 수 없다`() {
        // 빈 모임을 만들어 바로 완료를 누르면 평판이 공짜로 쌓인다.
        val m = meetup(past)

        val e = assertFailsWith<DailyMeetException> { m.complete(confirmedCount = 0) }
        assertEquals("확정된 참가자가 있어야 개최 기록으로 남길 수 있어요. 참가자를 먼저 확정해주세요.", e.message)
        assertEquals(MeetupStatus.CLOSED, m.status)
    }

    @Test
    fun `아직 열리지 않은 모임은 개최로 남길 수 없다`() {
        val m = meetup(future)

        val e = assertFailsWith<DailyMeetException> { m.complete(confirmedCount = 5) }
        assertEquals("아직 열리지 않은 모임이에요. 모임 시각이 지난 뒤에 완료로 남겨주세요.", e.message)
        assertEquals(MeetupStatus.CLOSED, m.status)
    }

    @Test
    fun `이미 개최된 모임에 다시 눌러도 아무 일도 없다`() {
        // 멱등 — 버튼이 두 번 눌려도 기록이 두 번 쌓이지 않는다.
        val m = meetup(past)
        m.complete(confirmedCount = 1)

        m.complete(confirmedCount = 0) // 조건을 못 갖춰도 이미 DONE이면 그대로

        assertEquals(MeetupStatus.DONE, m.status)
    }
}
