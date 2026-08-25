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

    /** 같은 회차 묶음의 모임 전부, 이른 날짜순 — "몇 번째 만남"을 세고 지난 회차를 보여줄 때. */
    fun findAllBySeries(seriesId: UUID): List<Meetup>
}

/**
 * 모임 따라가기 — 회차가 아니라 모임(series)을 따라간다.
 * 회차 하나가 끝나도 구독은 남아야 다음 회차를 알릴 수 있다.
 */
interface MeetupFollowRepository {
    fun follow(accountId: UUID, seriesId: UUID)

    fun unfollow(accountId: UUID, seriesId: UUID)

    /** 내가 따라가는 모임들 — 목록이 사람 수만큼 묻지 않도록 한 번에 준다. */
    fun findSeriesIdsByAccount(accountId: UUID): Set<UUID>

    /** 이 모임을 따라가는 사람들 — 새 회차가 열렸을 때 알릴 대상. */
    fun findAccountIdsBySeries(seriesId: UUID): List<UUID>
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
