package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.support.PostgresRepositoryTest
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

@Import(MeetupApplicationPersistenceAdapter::class, MeetupPersistenceAdapter::class)
class MeetupApplicationsBatchIT : PostgresRepositoryTest() {
    @Autowired private lateinit var applications: MeetupApplicationPersistenceAdapter
    @Autowired private lateinit var appJpa: MeetupApplicationJpaRepository
    @Autowired private lateinit var meetupJpa: MeetupJpaRepository
    @Autowired private lateinit var meetups: MeetupPersistenceAdapter

    private fun meetup(): UUID = requireNotNull(meetupJpa.saveAndFlush(MeetupJpaEntity(
        seriesId = UUID.randomUUID(), hostAccountId = UUID.randomUUID(), title = "테스트 모임",
        meetAt = Instant.parse("2027-01-01T09:00:00Z"), place = "서울", capacity = 8,
        fee = 0, kakaoLink = "https://open.kakao.com/o/test", createdAt = Instant.now(),
    )).id)

    private fun application(meetupId: UUID, status: String, createdAt: Instant): UUID =
        requireNotNull(appJpa.saveAndFlush(MeetupApplicationJpaEntity(
            meetupId = meetupId, applicantAccountId = UUID.randomUUID(), status = status,
            createdAt = createdAt, updatedAt = createdAt,
        )).id)

    @Test
    fun `요청한 모임의 확정 참가자만 신청순으로 가져온다`() {
        val first = meetup()
        val second = meetup()
        val other = meetup()
        val now = Instant.now()
        val later = application(first, "CONFIRMED", now.plusSeconds(60))
        val earlier = application(first, "CONFIRMED", now)
        val another = application(second, "CONFIRMED", now.plusSeconds(120))
        application(first, "APPLIED", now)
        application(first, "DECLINED", now)
        application(first, "CANCELED", now)
        application(other, "CONFIRMED", now)

        val result = applications.findConfirmedByMeetups(listOf(first, second))

        assertEquals(listOf(earlier, later, another), result.map { it.id })
        assertEquals(mapOf(first to 2, second to 1), result.groupingBy { it.meetupId }.eachCount())
    }

    @Test
    fun `목록이 비었으면 참가자도 없다`() {
        assertTrue(applications.findConfirmedByMeetups(emptyList()).isEmpty())
    }

    @Test
    fun `선택 연락 링크는 NULL로 저장되고 구버전 도메인에는 빈 값으로 읽힌다`() {
        val saved = meetupJpa.saveAndFlush(MeetupJpaEntity(
            seriesId = UUID.randomUUID(), hostAccountId = UUID.randomUUID(), title = "간단한 모임",
            meetAt = Instant.parse("2030-10-17T09:00:00Z"), place = "양재", capacity = 8,
            fee = 0, createdAt = Instant.now(),
        ))
        val domain = requireNotNull(meetups.findById(requireNotNull(saved.id)))
        assertEquals("", domain.kakaoLink)
        val resaved = meetups.save(domain)
        kotlin.test.assertNull(meetupJpa.findById(requireNotNull(resaved.id)).orElseThrow().kakaoLink)
    }

    @Test
    fun `관리 조회는 모든 신청 상태를 묶어 읽고 확정 수는 DB에서 집계한다`() {
        val first = meetup()
        val other = meetup()
        val now = Instant.now()
        val applied = application(first, "APPLIED", now)
        val confirmed = application(first, "CONFIRMED", now.plusSeconds(60))
        val canceled = application(first, "CANCELED", now.plusSeconds(120))
        application(other, "CONFIRMED", now)
        assertEquals(listOf(applied, confirmed, canceled), applications.findAllByMeetups(listOf(first)).map { it.id })
        assertEquals(mapOf(first to 1), applications.countConfirmedByMeetup(listOf(first)))
        assertTrue(applications.findAllByMeetups(emptyList()).isEmpty())
        assertTrue(applications.countConfirmedByMeetup(emptyList()).isEmpty())
    }
}
