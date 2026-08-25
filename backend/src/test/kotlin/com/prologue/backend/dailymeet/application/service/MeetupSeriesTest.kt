package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Meetup
import com.prologue.backend.dailymeet.domain.repository.MeetupApplicationRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupFollowRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals

/**
 * 모임의 회차 — 같은 모임이 다시 열리면 같은 묶음에 담기고, 따라가던 사람에게 알린다.
 * "남의 회차에 끼어들 수 없다"는 인가 규칙이라 특히 못을 박아 둔다.
 */
class MeetupSeriesTest {

    private val meetupRepository = mockk<MeetupRepository>(relaxed = true)
    private val applicationRepository = mockk<MeetupApplicationRepository>(relaxed = true)
    private val memberQueryService = mockk<com.prologue.backend.member.application.service.MemberQueryService>(relaxed = true)
    private val jobVerificationService = mockk<com.prologue.backend.member.application.service.JobVerificationService>(relaxed = true)
    private val notificationService = mockk<com.prologue.backend.notification.application.service.NotificationService>(relaxed = true)
    private val photoStorage = mockk<com.prologue.backend.member.application.port.PhotoStorage>(relaxed = true)
    private val hostPolicy = mockk<MeetupHostPolicy> { every { canHost(any()) } returns true }
    private val followRepository = mockk<MeetupFollowRepository>(relaxed = true)

    private val service = MeetupService(
        meetupRepository, applicationRepository, memberQueryService, jobVerificationService,
        notificationService, photoStorage, hostPolicy, followRepository,
    )

    private val host = UUID.randomUUID()
    private val stranger = UUID.randomUUID()

    private fun create(hostAccountId: UUID = host, seriesId: UUID? = null): UUID = service.create(
        hostAccountId = hostAccountId,
        title = "밑줄 모임",
        description = "책 이야기",
        meetAt = Instant.now().plus(Duration.ofDays(7)),
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
        seriesId = seriesId,
    )

    /** 저장 시 id를 부여하는 저장소 흉내 — 도메인은 영속 전 id가 null이다. */
    private fun captureSaved(): io.mockk.CapturingSlot<Meetup> {
        val saved = slot<Meetup>()
        every { meetupRepository.save(capture(saved)) } answers {
            val m = saved.captured
            Meetup.reconstitute(
                id = UUID.randomUUID(), seriesId = m.seriesId, hostAccountId = m.hostAccountId,
                title = m.title, description = m.description, meetAt = m.meetAt, place = m.place,
                placeUrl = m.placeUrl, placeAddress = m.placeAddress, capacity = m.capacity, fee = m.fee,
                feeFemale = m.feeFemale, genderLimit = m.genderLimit,
                minAgeMale = m.minAgeMale, maxAgeMale = m.maxAgeMale,
                minAgeFemale = m.minAgeFemale, maxAgeFemale = m.maxAgeFemale,
                minHeightMaleCm = m.minHeightMaleCm, minHeightFemaleCm = m.minHeightFemaleCm,
                requireJobVerified = m.requireJobVerified, emoji = m.emoji, color = m.color,
                coverUrls = m.coverUrls, kakaoLink = m.kakaoLink, status = m.status, createdAt = m.createdAt,
            )
        }
        return saved
    }

    @Test
    fun `새 모임은 자기 혼자짜리 회차로 시작한다`() {
        val saved = captureSaved()

        create()
        val first = saved.captured.seriesId
        create()

        assertNotEquals(first, saved.captured.seriesId) // 서로 다른 모임은 회차를 공유하지 않는다
        verify(exactly = 0) { notificationService.meetupSeriesOpened(any(), any()) }
    }

    @Test
    fun `이어 여는 회차는 같은 묶음에 담기고 따라가던 사람에게 알린다`() {
        val saved = captureSaved()
        val series = UUID.randomUUID()
        val follower = UUID.randomUUID()
        every { meetupRepository.findAllBySeries(series) } returns listOf(existing(series, host))
        every { followRepository.findAccountIdsBySeries(series) } returns listOf(follower, host)

        create(seriesId = series)

        assertEquals(series, saved.captured.seriesId)
        verify(exactly = 1) { notificationService.meetupSeriesOpened(follower, "밑줄 모임") }
        // 모임장 본인에게는 알리지 않는다 — 방금 자기가 연 모임이다
        verify(exactly = 0) { notificationService.meetupSeriesOpened(host, any()) }
    }

    @Test
    fun `남의 모임 회차에는 끼어들 수 없다`() {
        captureSaved()
        val series = UUID.randomUUID()
        every { meetupRepository.findAllBySeries(series) } returns listOf(existing(series, stranger))

        val e = assertFailsWith<DailyMeetException> { create(seriesId = series) }
        assertEquals("이어 열 수 있는 모임이 아니에요", e.message)
        verify(exactly = 0) { meetupRepository.save(any()) }
    }

    private fun existing(seriesId: UUID, hostAccountId: UUID): Meetup = Meetup.reconstitute(
        id = UUID.randomUUID(), seriesId = seriesId, hostAccountId = hostAccountId,
        title = "밑줄 모임", description = null, meetAt = Instant.now().minus(Duration.ofDays(30)),
        place = "서울 서초구 언남길 49", placeUrl = null, placeAddress = "서울 서초구 언남길 49",
        capacity = 8, fee = 0, feeFemale = null, genderLimit = null,
        minAgeMale = null, maxAgeMale = null, minAgeFemale = null, maxAgeFemale = null,
        minHeightMaleCm = null, minHeightFemaleCm = null, requireJobVerified = false,
        emoji = null, color = null, coverUrls = emptyList(), kakaoLink = "https://open.kakao.com/o/abc",
        status = com.prologue.backend.dailymeet.domain.model.MeetupStatus.DONE, createdAt = Instant.now(),
    )
}
