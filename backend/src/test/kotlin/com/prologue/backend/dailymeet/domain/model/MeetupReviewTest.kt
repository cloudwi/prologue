package com.prologue.backend.dailymeet.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * 모임 심사 — 모든 모임이 지나는 문.
 *
 * 이 규칙이 새면 심사가 형식이 된다. 특히 **고친 모임이 다시 심사로 돌아가는지**가
 * 중요하다 — 승인 뒤에 소개와 장소를 통째로 바꿔치기할 수 있으면 읽어본 의미가 없다.
 */
class MeetupReviewTest {
    private val future: Instant = Instant.now().plus(30, ChronoUnit.DAYS)

    private fun create(title: String = "밑줄 모임", description: String? = "책 한 권 들고 오세요") = Meetup.create(
        hostAccountId = UUID.randomUUID(),
        title = title,
        description = description,
        meetAt = future,
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

    @Test
    fun `새 모임은 심사부터 시작한다 — 승인 전에는 목록에 실리지 않는다`() {
        val m = create()

        assertEquals(MeetupStatus.PENDING, m.status)
        assertEquals(false, m.isOpen())
    }

    @Test
    fun `승인해야 열린다`() {
        val m = create()
        m.approve()

        assertEquals(MeetupStatus.OPEN, m.status)
        assertEquals(true, m.isOpen())
        assertNull(m.reviewNote)
    }

    @Test
    fun `반려에는 사유가 남는다 — 무엇을 고칠지 알아야 다시 올린다`() {
        val m = create()
        m.reject("장소가 사적인 공간이에요. 공개된 가게로 바꿔주세요.")

        assertEquals(MeetupStatus.REJECTED, m.status)
        assertEquals("장소가 사적인 공간이에요. 공개된 가게로 바꿔주세요.", m.reviewNote)
        assertEquals(false, m.isOpen())
    }

    @Test
    fun `사유 없는 반려는 막는다`() {
        val m = create()

        assertFailsWith<DailyMeetException> { m.reject("   ") }
        assertEquals(MeetupStatus.PENDING, m.status)
    }

    @Test
    fun `이미 열린 모임은 다시 승인하지 않는다`() {
        val m = create()
        m.approve()

        assertFailsWith<DailyMeetException> { m.approve() }
        assertFailsWith<DailyMeetException> { m.reject("사유") }
    }

    @Test
    fun `고친 모임은 다시 심사로 돌아간다 — 승인은 그때 읽은 그 글에 준 것이다`() {
        val approved = create()
        approved.approve()

        val edited = Meetup.update(
            existing = approved,
            title = "밑줄 모임",
            description = "장소가 바뀌었어요",
            meetAt = future,
            place = "다른 곳",
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
            coverUrls = listOf("https://cdn.example.com/c.jpg"),
            kakaoLink = "https://open.kakao.com/o/abc",
        )

        assertEquals(MeetupStatus.PENDING, edited.status)
        assertNull(edited.reviewNote)
    }

    @Test
    fun `심사로 돌아가면 새 신청은 막힌다 — 다만 이미 손든 사람의 약속은 서비스가 따로 지킨다`() {
        val m = create()
        m.approve()
        m.sendBackToReview()

        // 이 모임은 목록의 '모집 중'에서 빠진다. 이미 신청한 사람에게만 MeetupService.upcoming이
        // 따로 실어 보여준다 — 도메인은 문을 닫는 것까지만 안다.
        assertEquals(MeetupStatus.PENDING, m.status)
        assertEquals(false, m.isOpen())
    }

    @Test
    fun `반려된 모임도 고쳐서 다시 올리면 심사로 간다`() {
        val m = create()
        m.reject("소개가 너무 짧아요")
        m.sendBackToReview()

        assertEquals(MeetupStatus.PENDING, m.status)
        assertNull(m.reviewNote)
    }
}
