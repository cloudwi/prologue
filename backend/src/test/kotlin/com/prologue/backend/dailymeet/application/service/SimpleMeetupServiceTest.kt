package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Meetup
import com.prologue.backend.dailymeet.domain.model.MeetupApplication
import com.prologue.backend.dailymeet.domain.model.MeetupStatus
import com.prologue.backend.dailymeet.domain.repository.MeetupApplicationRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupFollowRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupRepository
import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.application.service.JobVerificationService
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.notification.application.service.NotificationService
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull

class SimpleMeetupServiceTest {
    private val host = UUID.randomUUID()
    private val id = UUID.randomUUID()
    private val at = Instant.parse("2030-10-17T09:00:00Z")
    private val repo = mockk<MeetupRepository>(relaxed = true)
    private val apps = mockk<MeetupApplicationRepository>(relaxed = true)
    private val members = mockk<MemberQueryService>(relaxed = true)
    private val jobs = mockk<JobVerificationService>(relaxed = true)
    private val service = MeetupService(repo, apps, members, jobs, mockk<NotificationService>(relaxed = true), mockk<PhotoStorage>(), mockk<MeetupFollowRepository>(relaxed = true))
    private val details = SimpleMeetupDetails("과자 모임", at, "서로서가", 8)

    private fun existing(owner: UUID = host): Meetup = Meetup.reconstitute(
        id = id, seriesId = UUID.randomUUID(), hostAccountId = owner, title = "과자 모임", description = "[사진1] 원래 소개",
        meetAt = at, place = "서로서가", placeUrl = null, placeAddress = null, capacity = 8,
        capacityMale = 4, capacityFemale = 4, waitlistCapacity = 20, fee = 10000, feeFemale = 8000,
        genderLimit = null, minAgeMale = 25, maxAgeMale = 39, minAgeFemale = 25, maxAgeFemale = 39,
        minHeightMaleCm = 170, minHeightFemaleCm = null, requireJobVerified = true,
        emoji = "🍪", color = "#D9694C", coverUrls = listOf("https://cdn/cover.jpg"), bodyImageUrls = listOf("https://cdn/body.jpg"),
        kakaoLink = "https://open.kakao.com/o/test", status = MeetupStatus.OPEN, createdAt = Instant.EPOCH,
    )

    @Test fun `필수 정보만으로 만들면 세부 조건 없이 심사 대기로 저장한다`() {
        val saved = slot<Meetup>()
        every { repo.save(capture(saved)) } returns mockk { every { id } returns this@SimpleMeetupServiceTest.id }
        assertEquals(id, service.saveSimple(host, null, details))
        assertEquals(MeetupStatus.PENDING, saved.captured.status)
        assertNull(saved.captured.description)
        assertEquals(emptyList(), saved.captured.coverUrls)
        assertEquals("", saved.captured.kakaoLink)
        assertNull(saved.captured.capacityMale)
        assertNull(saved.captured.feeFemale)
        assertFalse(saved.captured.requireJobVerified)
        assertEquals(0, saved.captured.fee)
    }

    @Test fun `앱 수정은 보이지 않는 기존 조건과 본문 사진을 보존한다`() {
        val old = existing()
        every { repo.findById(id) } returns old
        val saved = slot<Meetup>()
        every { repo.save(capture(saved)) } answers { firstArg() }
        service.saveSimple(host, id, details.copy(title = "새 이름", description = old.description, fee = old.fee, coverUrls = old.coverUrls, kakaoLink = old.kakaoLink))
        assertEquals(old.seriesId, saved.captured.seriesId)
        assertEquals(old.capacityMale, saved.captured.capacityMale)
        assertEquals(old.feeFemale, saved.captured.feeFemale)
        assertEquals(old.minHeightMaleCm, saved.captured.minHeightMaleCm)
        assertEquals(old.bodyImageUrls, saved.captured.bodyImageUrls)
        assertEquals(MeetupStatus.PENDING, saved.captured.status)
    }

    @Test fun `남의 모임은 간단한 폼으로도 수정할 수 없다`() {
        every { repo.findById(id) } returns existing(UUID.randomUUID())
        assertFailsWith<DailyMeetException> { service.saveSimple(host, id, details) }
        verify(exactly = 0) { repo.save(any()) }
    }

    @Test fun `별도 모임장 자격 없이 만든 회원이 소유자가 된다`() {
        val member = UUID.randomUUID()
        val saved = slot<Meetup>()
        every { repo.save(capture(saved)) } returns mockk { every { id } returns this@SimpleMeetupServiceTest.id }
        service.saveSimple(member, null, details)
        assertEquals(member, saved.captured.hostAccountId)
        assertEquals(MeetupStatus.PENDING, saved.captured.status)
    }

    @Test fun `일반 회원도 자기 모임을 마감할 수 있다`() {
        val member = UUID.randomUUID()
        val meetup = existing(member)
        every { repo.findById(id) } returns meetup
        service.close(member, id)
        assertEquals(MeetupStatus.CLOSED, meetup.status)
        verify(exactly = 1) { repo.save(meetup) }
    }

    @Test fun `남의 모임은 마감하거나 취소할 수 없다`() {
        every { repo.findById(id) } returns existing(UUID.randomUUID())
        assertFailsWith<DailyMeetException> { service.close(host, id) }
        assertFailsWith<DailyMeetException> { service.cancelMeetup(host, id) }
        verify(exactly = 0) { repo.save(any()) }
    }

    @Test fun `남의 모임 신청자는 확정하거나 거절할 수 없다`() {
        val applicationId = UUID.randomUUID()
        val application = mockk<MeetupApplication> { every { meetupId } returns this@SimpleMeetupServiceTest.id }
        every { apps.findById(applicationId) } returns application
        every { repo.findById(id) } returns existing(UUID.randomUUID())
        assertFailsWith<DailyMeetException> { service.confirmApplication(host, applicationId) }
        assertFailsWith<DailyMeetException> { service.declineApplication(host, applicationId) }
        verify(exactly = 0) { apps.save(any()) }
    }

    @Test fun `연락 링크가 선택이어도 입력한 잘못된 링크는 막는다`() {
        assertFailsWith<DailyMeetException> { service.saveSimple(host, null, details.copy(kakaoLink = "http://example.com")) }
    }

    @Test fun `이미 확정된 인원 아래로 정원을 줄일 수 없다`() {
        every { repo.findById(id) } returns existing()
        every { apps.countConfirmedByMeetup(listOf(id)) } returns mapOf(id to 7)
        val error = assertFailsWith<DailyMeetException> { service.saveSimple(host, id, details.copy(capacity = 6)) }
        assertEquals("이미 확정된 7명보다 정원을 줄일 수 없어요", error.message)
        verify(exactly = 0) { repo.save(any()) }
    }

    @Test fun `관리 목록은 모임마다 신청자를 되묻지 않는다`() {
        every { repo.findAllByHost(host) } returns listOf(existing())
        every { apps.findAllByMeetups(listOf(id)) } returns emptyList()
        assertEquals(1, service.hostMeetups(host).size)
        verify(exactly = 1) { apps.findAllByMeetups(listOf(id)) }
        verify(exactly = 0) { apps.findAllByMeetup(any()) }
    }
}
