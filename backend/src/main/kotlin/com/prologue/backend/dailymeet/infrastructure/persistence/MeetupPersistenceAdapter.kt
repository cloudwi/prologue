package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Meetup
import com.prologue.backend.dailymeet.domain.model.MeetupApplication
import com.prologue.backend.dailymeet.domain.model.MeetupApplicationStatus
import com.prologue.backend.dailymeet.domain.model.MeetupStatus
import com.prologue.backend.dailymeet.domain.model.RecapStatus
import com.prologue.backend.dailymeet.domain.repository.MeetupApplicationRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupFollowRepository
import com.prologue.backend.dailymeet.domain.repository.MeetupRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
class MeetupPersistenceAdapter(
    private val jpa: MeetupJpaRepository,
) : MeetupRepository {

    override fun save(meetup: Meetup): Meetup = jpa.save(meetup.toEntity()).toDomain()

    override fun findById(id: UUID): Meetup? = jpa.findById(id).orElse(null)?.toDomain()

    override fun findUpcoming(after: Instant): List<Meetup> =
        jpa.findByStatusInAndMeetAtAfterOrderByMeetAtAsc(
            listOf(MeetupStatus.OPEN.name, MeetupStatus.CLOSED.name),
            after,
        ).map { it.toDomain() }

    override fun findDone(limit: Int): List<Meetup> =
        jpa.findByStatusOrderByMeetAtDesc(MeetupStatus.DONE.name, PageRequest.of(0, limit)).map { it.toDomain() }

    override fun findAllByHost(hostAccountId: UUID): List<Meetup> =
        jpa.findByHostAccountIdOrderByCreatedAtDesc(hostAccountId).map { it.toDomain() }

    override fun countDoneByHost(hostAccountId: UUID): Int =
        jpa.countByHostAccountIdAndStatus(hostAccountId, MeetupStatus.DONE.name).toInt()

    override fun findAll(): List<Meetup> = jpa.findAllByOrderByCreatedAtDesc().map { it.toDomain() }

    override fun delete(id: UUID) = jpa.deleteById(id)

    override fun findAllBySeries(seriesId: UUID): List<Meetup> =
        jpa.findBySeriesIdOrderByMeetAtAsc(seriesId).map { it.toDomain() }

    private fun Meetup.toEntity(): MeetupJpaEntity =
        MeetupJpaEntity(
            id = id,
            seriesId = seriesId,
            hostAccountId = hostAccountId,
            title = title,
            description = description,
            meetAt = meetAt,
            place = place,
            placeUrl = placeUrl,
            placeAddress = placeAddress,
            capacity = capacity,
            capacityMale = capacityMale,
            capacityFemale = capacityFemale,
            waitlistCapacity = waitlistCapacity,
            fee = fee,
            feeFemale = feeFemale,
            genderLimit = genderLimit,
            minAgeMale = minAgeMale,
            maxAgeMale = maxAgeMale,
            minAgeFemale = minAgeFemale,
            maxAgeFemale = maxAgeFemale,
            minHeightMaleCm = minHeightMaleCm,
            minHeightFemaleCm = minHeightFemaleCm,
            requireJobVerified = requireJobVerified,
            emoji = emoji,
            color = color,
            coverUrls = coverUrls.joinToString(",").ifBlank { null },
            bodyImageUrls = bodyImageUrls.joinToString(",").ifBlank { null },
            kakaoLink = kakaoLink,
            status = status.name,
            reviewNote = reviewNote,
            createdAt = createdAt,
            recap = recap,
            recapImageUrls = recapImageUrls.joinToString(",").ifBlank { null },
            recapStatus = recapStatus.name,
            recapReviewNote = recapReviewNote,
        )

    private fun MeetupJpaEntity.toDomain(): Meetup =
        Meetup.reconstitute(
            id = requireNotNull(id) { "영속된 모임은 id를 가진다" },
            seriesId = seriesId,
            hostAccountId = hostAccountId,
            title = title,
            description = description,
            meetAt = meetAt,
            place = place,
            placeUrl = placeUrl,
            placeAddress = placeAddress,
            capacity = capacity,
            capacityMale = capacityMale,
            capacityFemale = capacityFemale,
            waitlistCapacity = waitlistCapacity,
            fee = fee,
            feeFemale = feeFemale,
            genderLimit = genderLimit,
            minAgeMale = minAgeMale,
            maxAgeMale = maxAgeMale,
            minAgeFemale = minAgeFemale,
            maxAgeFemale = maxAgeFemale,
            minHeightMaleCm = minHeightMaleCm,
            minHeightFemaleCm = minHeightFemaleCm,
            requireJobVerified = requireJobVerified,
            emoji = emoji,
            color = color,
            coverUrls = coverUrls?.split(',')?.filter { it.isNotBlank() } ?: emptyList(),
            bodyImageUrls = bodyImageUrls?.split(',')?.filter { it.isNotBlank() } ?: emptyList(),
            kakaoLink = kakaoLink,
            status = MeetupStatus.valueOf(status),
            reviewNote = reviewNote,
            createdAt = createdAt,
            recap = recap,
            recapImageUrls = recapImageUrls?.split(',')?.filter { it.isNotBlank() } ?: emptyList(),
            recapStatus = RecapStatus.valueOf(recapStatus),
            recapReviewNote = recapReviewNote,
        )
}

@Repository
class MeetupApplicationPersistenceAdapter(
    private val jpa: MeetupApplicationJpaRepository,
) : MeetupApplicationRepository {

    override fun save(application: MeetupApplication): MeetupApplication =
        jpa.save(application.toEntity()).toDomain()

    override fun findById(id: UUID): MeetupApplication? = jpa.findById(id).orElse(null)?.toDomain()

    override fun findByMeetupAndApplicant(meetupId: UUID, applicantAccountId: UUID): MeetupApplication? =
        jpa.findByMeetupIdAndApplicantAccountId(meetupId, applicantAccountId)?.toDomain()

    override fun findAllByMeetup(meetupId: UUID): List<MeetupApplication> =
        jpa.findByMeetupIdOrderByCreatedAtAsc(meetupId).map { it.toDomain() }

    override fun countConfirmedByMeetup(meetupIds: Collection<UUID>): Map<UUID, Int> {
        if (meetupIds.isEmpty()) return emptyMap()
        return jpa.findByMeetupIdInAndStatus(meetupIds, MeetupApplicationStatus.CONFIRMED.name)
            .groupingBy { it.meetupId }
            .eachCount()
    }

    override fun findAllByApplicant(applicantAccountId: UUID): List<MeetupApplication> =
        jpa.findByApplicantAccountId(applicantAccountId).map { it.toDomain() }

    private fun MeetupApplication.toEntity(): MeetupApplicationJpaEntity =
        MeetupApplicationJpaEntity(
            id = id,
            meetupId = meetupId,
            applicantAccountId = applicantAccountId,
            status = status.name,
            createdAt = createdAt,
            updatedAt = updatedAt,
        )

    private fun MeetupApplicationJpaEntity.toDomain(): MeetupApplication =
        MeetupApplication.reconstitute(
            id = requireNotNull(id) { "영속된 신청은 id를 가진다" },
            meetupId = meetupId,
            applicantAccountId = applicantAccountId,
            status = MeetupApplicationStatus.valueOf(status),
            createdAt = createdAt,
            updatedAt = updatedAt,
        )
}

/**
 * 모임 따라가기 저장소. 멱등하게 만든다 — 버튼이 두 번 눌려도 같은 상태여야 한다.
 */
@Repository
class MeetupFollowPersistenceAdapter(
    private val jpa: MeetupFollowJpaRepository,
) : MeetupFollowRepository {
    override fun follow(accountId: UUID, seriesId: UUID) {
        val id = MeetupFollowId(accountId, seriesId)
        if (jpa.existsById(id)) return
        jpa.save(MeetupFollowJpaEntity(id))
    }

    override fun unfollow(accountId: UUID, seriesId: UUID) {
        jpa.deleteById(MeetupFollowId(accountId, seriesId))
    }

    override fun findSeriesIdsByAccount(accountId: UUID): Set<UUID> =
        jpa.findAllByAccount(accountId).map { it.seriesId }.toSet()

    override fun findAccountIdsBySeries(seriesId: UUID): List<UUID> =
        jpa.findAllBySeries(seriesId).map { it.accountId }
}
