package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Meetup
import com.prologue.backend.dailymeet.domain.model.MeetupApplication
import java.time.Instant
import java.util.UUID

interface MeetupRepository {
    fun save(meetup: Meetup): Meetup

    fun findById(id: UUID): Meetup?

    /** 다가오는 모임(모집 중·마감) — 앱 목록. 지난 모임은 히스토리로만 남는다. */
    fun findUpcoming(after: Instant): List<Meetup>

    /** 개최 완료된 모임, 최신순 — "얼마나 잘 운영되는지"의 공개 기록. */
    fun findDone(limit: Int): List<Meetup>

    /** 이 모임장의 모임 전부, 최신순 — 모임장 콘솔. */
    fun findAllByHost(hostAccountId: UUID): List<Meetup>

    /** 이 모임장이 개최 완료한 모임 수 — 신뢰 신호. */
    fun countDoneByHost(hostAccountId: UUID): Int

    /** 모임 전부, 최신순 — 어드민. */
    fun findAll(): List<Meetup>

    /** 완전 삭제 — 어드민 전용. 신청은 FK cascade로 함께 지워진다. */
    fun delete(id: UUID)
}

interface MeetupApplicationRepository {
    fun save(application: MeetupApplication): MeetupApplication

    fun findById(id: UUID): MeetupApplication?

    fun findByMeetupAndApplicant(meetupId: UUID, applicantAccountId: UUID): MeetupApplication?

    /** 모임의 신청 전부(취소 포함), 신청순 — 모임장이 본다. */
    fun findAllByMeetup(meetupId: UUID): List<MeetupApplication>

    /** 모임별 확정 인원 — 목록 카드가 "n/정원"을 그릴 때. */
    fun countConfirmedByMeetup(meetupIds: Collection<UUID>): Map<UUID, Int>

    /** 내 신청 전부 — 앱 목록에서 내 상태를 표시할 때. */
    fun findAllByApplicant(applicantAccountId: UUID): List<MeetupApplication>
}
