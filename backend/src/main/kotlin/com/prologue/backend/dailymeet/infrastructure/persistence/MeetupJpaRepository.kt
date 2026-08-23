package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.time.Instant
import java.util.UUID

interface MeetupJpaRepository : JpaRepository<MeetupJpaEntity, UUID> {
    fun findAllByOrderByCreatedAtDesc(): List<MeetupJpaEntity>

    fun findByStatusInAndMeetAtAfterOrderByMeetAtAsc(statuses: Collection<String>, after: Instant): List<MeetupJpaEntity>

    fun findByStatusOrderByMeetAtDesc(status: String, pageable: Pageable): List<MeetupJpaEntity>

    fun findByHostAccountIdOrderByCreatedAtDesc(hostAccountId: UUID): List<MeetupJpaEntity>

    fun countByHostAccountIdAndStatus(hostAccountId: UUID, status: String): Long
}

interface MeetupApplicationJpaRepository : JpaRepository<MeetupApplicationJpaEntity, UUID> {
    fun findByMeetupIdAndApplicantAccountId(meetupId: UUID, applicantAccountId: UUID): MeetupApplicationJpaEntity?

    fun findByMeetupIdOrderByCreatedAtAsc(meetupId: UUID): List<MeetupApplicationJpaEntity>

    fun findByMeetupIdInAndStatus(meetupIds: Collection<UUID>, status: String): List<MeetupApplicationJpaEntity>

    fun findByApplicantAccountId(applicantAccountId: UUID): List<MeetupApplicationJpaEntity>
}
