package com.prologue.backend.dailymeet.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * 모임 후기 — 끝난 뒤에 남기는 기록, 그리고 그 심사.
 *
 * 여기서 지키는 것 셋이다.
 *
 * 하나, **끝난 모임에만** 쓸 수 있다. 열리지도 않은 모임의 후기는 후기가 아니라 예고이고,
 * 그건 소개 글이 할 일이다. 이 문이 열려 있으면 "다녀왔습니다"가 모집 문구가 된다.
 *
 * 둘, **고쳐 쓰면 다시 심사**다. 승인은 그때 읽은 그 글에 준 것이라, 통과한 뒤에 통째로
 * 바꿔치기할 수 있으면 심사가 형식이 된다. 모임 본문과 같은 규칙이다([MeetupReviewTest]).
 *
 * 셋, 승인되지 않은 글은 **공개되지 않는다**. 앱과 초대장이 [Meetup.hasPublicRecap]만 믿는다.
 */
class MeetupRecapTest {
    private val meetAt: Instant = Instant.now().plus(30, ChronoUnit.DAYS)

    /** 개최까지 끝난 모임 — 후기를 쓸 수 있는 유일한 상태. */
    private fun done(): Meetup {
        val m = Meetup.create(
            hostAccountId = UUID.randomUUID(),
            title = "밑줄 모임",
            description = "책 한 권 들고 오세요",
            meetAt = meetAt,
            place = "1층 파란지붕 서로서가",
            placeUrl = null,
            placeAddress = "서울 서초구 언남길 49",
            capacity = 8,
            fee = 35000,
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
            coverUrls = listOf("https://cdn.example.com/c.jpg"),
            kakaoLink = "https://open.kakao.com/o/abc",
        )
        m.approve()
        // 시각이 지나고 확정 참가자가 있어야 개최 기록이 된다. 모임은 미래로만 만들 수 있으니
        // '지금'을 그 뒤로 옮겨서 부른다.
        m.complete(confirmedCount = 5, now = meetAt.plus(1, ChronoUnit.DAYS))
        return m
    }

    @Test
    fun `개최 완료된 모임에만 후기를 쓸 수 있다`() {
        val m = done()
        m.writeRecap("여덟 분이 오셨어요.", listOf("https://cdn.example.com/r1.jpg"))

        assertEquals("여덟 분이 오셨어요.", m.recap)
        assertEquals(listOf("https://cdn.example.com/r1.jpg"), m.recapImageUrls)
    }

    @Test
    fun `열리지도 않은 모임에는 후기를 쓸 수 없다 — 그건 예고지 후기가 아니다`() {
        val m = Meetup.create(
            hostAccountId = UUID.randomUUID(),
            title = "밑줄 모임",
            description = null,
            meetAt = Instant.now().plus(30, ChronoUnit.DAYS),
            place = "서로서가",
            placeUrl = null,
            placeAddress = null,
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
        )

        assertFailsWith<DailyMeetException> { m.writeRecap("다녀왔습니다", emptyList()) }
    }

    @Test
    fun `쓰면 심사로 들어간다 — 아직 공개되지 않는다`() {
        val m = done()
        m.writeRecap("여덟 분이 오셨어요.", emptyList())

        assertEquals(RecapStatus.PENDING, m.recapStatus)
        assertFalse(m.hasPublicRecap())
    }

    @Test
    fun `승인해야 공개된다`() {
        val m = done()
        m.writeRecap("여덟 분이 오셨어요.", emptyList())
        m.approveRecap()

        assertEquals(RecapStatus.APPROVED, m.recapStatus)
        assertTrue(m.hasPublicRecap())
        assertNull(m.recapReviewNote)
    }

    @Test
    fun `고쳐 쓰면 승인이 풀리고 다시 심사로 간다`() {
        val m = done()
        m.writeRecap("여덟 분이 오셨어요.", emptyList())
        m.approveRecap()

        m.writeRecap("사실은 열두 분이 오셨어요. 그리고 링크 하나 붙입니다.", emptyList())

        assertEquals(RecapStatus.PENDING, m.recapStatus)
        assertFalse(m.hasPublicRecap())
    }

    @Test
    fun `반려에는 사유가 남는다`() {
        val m = done()
        m.writeRecap("여덟 분이 오셨어요.", emptyList())
        m.rejectRecap("참가자 얼굴이 그대로 보여요. 동의를 받았는지 확인해주세요.")

        assertEquals(RecapStatus.REJECTED, m.recapStatus)
        assertEquals("참가자 얼굴이 그대로 보여요. 동의를 받았는지 확인해주세요.", m.recapReviewNote)
        assertFalse(m.hasPublicRecap())
    }

    @Test
    fun `사유 없는 반려는 받지 않는다`() {
        val m = done()
        m.writeRecap("여덟 분이 오셨어요.", emptyList())

        assertFailsWith<DailyMeetException> { m.rejectRecap("   ") }
    }

    @Test
    fun `심사 중이 아닌 후기는 승인도 반려도 할 수 없다`() {
        val m = done()

        assertFailsWith<DailyMeetException> { m.approveRecap() }
        assertFailsWith<DailyMeetException> { m.rejectRecap("아무 사유") }
    }

    @Test
    fun `글도 사진도 비우면 후기를 지운 것이다 — 심사 목록에 빈 줄이 남지 않게`() {
        val m = done()
        m.writeRecap("여덟 분이 오셨어요.", emptyList())
        m.approveRecap()

        m.writeRecap("   ", emptyList())

        assertNull(m.recap)
        assertEquals(RecapStatus.NONE, m.recapStatus)
        assertFalse(m.hasPublicRecap())
    }

    @Test
    fun `사진만 있는 후기도 공개된다 — 그날의 사진 한 장이면 충분할 때가 있다`() {
        val m = done()
        m.writeRecap(null, listOf("https://cdn.example.com/r1.jpg"))
        m.approveRecap()

        assertTrue(m.hasPublicRecap())
    }

    @Test
    fun `후기 사진 주소는 https여야 한다`() {
        val m = done()

        assertFailsWith<DailyMeetException> { m.writeRecap("갔다 왔어요", listOf("javascript:alert(1)")) }
    }

    @Test
    fun `후기는 1000자를 넘을 수 없다`() {
        val m = done()

        assertFailsWith<DailyMeetException> { m.writeRecap("가".repeat(1001), emptyList()) }
    }

    @Test
    fun `후기 사진은 열 장까지다`() {
        val m = done()
        val eleven = (1..11).map { "https://cdn.example.com/r$it.jpg" }

        assertFailsWith<DailyMeetException> { m.writeRecap("갔다 왔어요", eleven) }
    }
}
