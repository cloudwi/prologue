package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.support.PostgresRepositoryTest
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

@Import(MeetupApplicationPersistenceAdapter::class)
class MeetupApplicationsBatchIT : PostgresRepositoryTest() {
    @Autowired private lateinit var applications: MeetupApplicationPersistenceAdapter
    @Autowired private lateinit var appJpa: MeetupApplicationJpaRepository
    @Autowired private lateinit var meetupJpa: MeetupJpaRepository

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
}
