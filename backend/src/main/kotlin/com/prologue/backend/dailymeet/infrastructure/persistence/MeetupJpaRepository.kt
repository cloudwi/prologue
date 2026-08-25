package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.UUID

interface MeetupJpaRepository : JpaRepository<MeetupJpaEntity, UUID> {
    fun findAllByOrderByCreatedAtDesc(): List<MeetupJpaEntity>

    fun findByStatusInAndMeetAtAfterOrderByMeetAtAsc(statuses: Collection<String>, after: Instant): List<MeetupJpaEntity>

    fun findByStatusOrderByMeetAtDesc(status: String, pageable: Pageable): List<MeetupJpaEntity>

    fun findByHostAccountIdOrderByCreatedAtDesc(hostAccountId: UUID): List<MeetupJpaEntity>

    fun countByHostAccountIdAndStatus(hostAccountId: UUID, status: String): Long

    fun findBySeriesIdOrderByMeetAtAsc(seriesId: UUID): List<MeetupJpaEntity>
}

interface MeetupFollowJpaRepository : JpaRepository<MeetupFollowJpaEntity, MeetupFollowId> {
    /*
     * 키가 @EmbeddedId라 파생 쿼리(findByAccountId)를 쓰면 안 된다.
     * 엔티티에 편의 게터(val accountId get() = id.accountId)가 있어 이름은 해석되지만,
     * 실제 영속 속성은 id.accountId뿐이라 실행 시점에 터진다 — 조회 하나가 500이 됐다(2026-08-25).
     * 경로를 명시해 둔다.
     */
    @Query("select f from MeetupFollowJpaEntity f where f.id.accountId = :accountId")
    fun findAllByAccount(@Param("accountId") accountId: UUID): List<MeetupFollowJpaEntity>

    @Query("select f from MeetupFollowJpaEntity f where f.id.seriesId = :seriesId")
    fun findAllBySeries(@Param("seriesId") seriesId: UUID): List<MeetupFollowJpaEntity>
}

interface MeetupApplicationJpaRepository : JpaRepository<MeetupApplicationJpaEntity, UUID> {
    fun findByMeetupIdAndApplicantAccountId(meetupId: UUID, applicantAccountId: UUID): MeetupApplicationJpaEntity?

    fun findByMeetupIdOrderByCreatedAtAsc(meetupId: UUID): List<MeetupApplicationJpaEntity>

    fun findByMeetupIdInAndStatus(meetupIds: Collection<UUID>, status: String): List<MeetupApplicationJpaEntity>

    fun findByApplicantAccountId(applicantAccountId: UUID): List<MeetupApplicationJpaEntity>
}
