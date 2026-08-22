package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/** 모임의 상태 — 모집 중(OPEN) → 모집 마감(CLOSED) → 개최 완료(DONE), 또는 취소(CANCELED). */
enum class MeetupStatus { OPEN, CLOSED, DONE, CANCELED }

/**
 * 오프라인 모임 — 모임장이 웹 콘솔(/host)에서 만들고, 회원이 앱에서 신청한다.
 *
 * 우리는 돈을 만지지 않는다. 참가비 입금과 자리 배분은 모임장의 카카오 오픈채팅에서
 * 이뤄지고, 모임장은 입금을 확인한 신청자에게 확정 표시만 남긴다. 그래서 이 모델에는
 * 결제가 없다 — 신청·확정·개최의 기록만 있고, 그 기록(개최 횟수·확정 인원)이
 * 모임장의 신뢰 신호가 되어 앱에 공개된다.
 */
class Meetup private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val hostAccountId: UUID,
    val title: String,
    val description: String?,
    val meetAt: Instant,
    val place: String,
    /** 지도 링크(카카오맵·네이버지도 공유 URL) — 참가자가 바로 길을 찾는다. */
    val placeUrl: String?,
    val capacity: Int,
    val fee: Int,
    /** 여성 참가비 — null이면 fee(공통)와 동일. 성별에 따라 값을 달리 받는 모임이 흔해서. */
    val feeFemale: Int?,
    /** 참가 성별 제한(MALE/FEMALE) — null이면 모두. */
    val genderLimit: String?,
    // 참가 조건 — 남/녀의 기준이 다른 모임이 보통이라 성별별로 둔다. null = 제한 없음.
    val minAgeMale: Int?,
    val maxAgeMale: Int?,
    val minAgeFemale: Int?,
    val maxAgeFemale: Int?,
    val minHeightMaleCm: Int?,
    val minHeightFemaleCm: Int?,
    /** 직장 인증을 마친 사람만 받는 모임인지. */
    val requireJobVerified: Boolean,
    /** 커버 — 사진 여러 장(첫 장이 메인). 이모지+색은 옛 모임의 폴백. */
    val emoji: String?,
    val color: String?,
    val coverUrls: List<String>,
    val kakaoLink: String,
    status: MeetupStatus,
    val createdAt: Instant,
) {
    var status: MeetupStatus = status
        private set

    /** 모집을 닫는다 — 자리가 다 찼거나 모임장이 그만 받기로 했을 때. 신청만 막히고 확정은 계속할 수 있다. */
    fun close() {
        if (status != MeetupStatus.OPEN) throw DailyMeetException("모집 중인 모임만 마감할 수 있어요")
        status = MeetupStatus.CLOSED
    }

    /** 다시 연다 — 마감했다가 자리가 났을 때. */
    fun reopen() {
        if (status != MeetupStatus.CLOSED) throw DailyMeetException("마감된 모임만 다시 열 수 있어요")
        status = MeetupStatus.OPEN
    }

    /** 개최 완료 — 이 기록이 모임장의 히스토리(신뢰 신호)가 된다. */
    fun complete() {
        if (status == MeetupStatus.DONE) return // 멱등
        if (status == MeetupStatus.CANCELED) throw DailyMeetException("취소된 모임이에요")
        status = MeetupStatus.DONE
    }

    /** 취소 — 열리지 못한 모임. 히스토리에 남지 않는다. */
    fun cancel() {
        if (status == MeetupStatus.DONE) throw DailyMeetException("이미 개최된 모임이에요")
        status = MeetupStatus.CANCELED
    }

    /** 지금 신청을 받을 수 있는지. */
    fun isOpen(): Boolean = status == MeetupStatus.OPEN

    companion object {
        private const val TITLE_MAX = 80
        private const val DESCRIPTION_MAX = 1000
        private const val PLACE_MAX = 120
        private const val KAKAO_LINK_MAX = 300
        private const val CAPACITY_MIN = 2
        private const val CAPACITY_MAX = 100
        private const val COVER_MAX = 5

        fun create(
            hostAccountId: UUID,
            title: String,
            description: String?,
            meetAt: Instant,
            place: String,
            placeUrl: String?,
            capacity: Int,
            fee: Int,
            feeFemale: Int?,
            genderLimit: String?,
            minAgeMale: Int?,
            maxAgeMale: Int?,
            minAgeFemale: Int?,
            maxAgeFemale: Int?,
            minHeightMaleCm: Int?,
            minHeightFemaleCm: Int?,
            requireJobVerified: Boolean,
            emoji: String?,
            color: String?,
            coverUrls: List<String>,
            kakaoLink: String,
            now: Instant = Instant.now(),
        ): Meetup {
            val cleanTitle = title.trim()
            if (cleanTitle.isBlank()) throw DailyMeetException("모임 이름을 적어주세요")
            if (cleanTitle.length > TITLE_MAX) throw DailyMeetException("모임 이름은 ${TITLE_MAX}자 이하여야 해요")
            val cleanPlace = place.trim()
            if (cleanPlace.isBlank()) throw DailyMeetException("모임 장소를 적어주세요")
            if (cleanPlace.length > PLACE_MAX) throw DailyMeetException("장소는 ${PLACE_MAX}자 이하여야 해요")
            val cleanDescription = description?.trim()?.ifBlank { null }
            if ((cleanDescription?.length ?: 0) > DESCRIPTION_MAX) throw DailyMeetException("소개는 ${DESCRIPTION_MAX}자 이하여야 해요")
            if (capacity < CAPACITY_MIN || capacity > CAPACITY_MAX) throw DailyMeetException("정원은 ${CAPACITY_MIN}~${CAPACITY_MAX}명이어야 해요")
            if (fee < 0) throw DailyMeetException("참가비가 올바르지 않아요")
            if (feeFemale != null && feeFemale < 0) throw DailyMeetException("여성 참가비가 올바르지 않아요")
            if (genderLimit != null && genderLimit != "MALE" && genderLimit != "FEMALE") {
                throw DailyMeetException("성별 제한 값이 올바르지 않아요")
            }
            validateConditions(minAgeMale, maxAgeMale, minHeightMaleCm)
            validateConditions(minAgeFemale, maxAgeFemale, minHeightFemaleCm)
            val cleanEmoji = emoji?.trim()?.ifBlank { null }
            if (cleanEmoji != null && cleanEmoji.length > 8) throw DailyMeetException("이모지가 올바르지 않아요")
            val cleanColor = color?.trim()?.ifBlank { null }
            if (cleanColor != null && !cleanColor.matches(Regex("#[0-9a-fA-F]{6}"))) {
                throw DailyMeetException("색상 값이 올바르지 않아요")
            }
            val cleanPlaceUrl = placeUrl?.trim()?.ifBlank { null }
            if (cleanPlaceUrl != null && (!cleanPlaceUrl.startsWith("https://") || cleanPlaceUrl.length > 500)) {
                throw DailyMeetException("지도 링크가 올바르지 않아요")
            }
            val cleanCovers = coverUrls.map { it.trim() }.filter { it.isNotBlank() }
            if (cleanCovers.size > COVER_MAX) throw DailyMeetException("커버 사진은 ${COVER_MAX}장까지예요")
            if (cleanCovers.any { !it.startsWith("https://") || it.length > 500 }) {
                throw DailyMeetException("커버 사진 주소가 올바르지 않아요")
            }
            if (meetAt.isBefore(now)) throw DailyMeetException("모임 일시는 미래여야 해요")
            val cleanLink = kakaoLink.trim()
            // 신청자에게만 내려가는 링크 — 형태만 죈다(오픈채팅이 아닌 https 링크도 허용).
            if (!cleanLink.startsWith("https://")) throw DailyMeetException("카카오 오픈채팅 링크(https://)를 넣어주세요")
            if (cleanLink.length > KAKAO_LINK_MAX) throw DailyMeetException("링크가 너무 길어요")
            return Meetup(
                null, hostAccountId, cleanTitle, cleanDescription, meetAt, cleanPlace, cleanPlaceUrl,
                capacity, fee, feeFemale, genderLimit,
                minAgeMale, maxAgeMale, minAgeFemale, maxAgeFemale, minHeightMaleCm, minHeightFemaleCm,
                requireJobVerified, cleanEmoji, cleanColor, cleanCovers, cleanLink, MeetupStatus.OPEN, now,
            )
        }

        fun reconstitute(
            id: UUID,
            hostAccountId: UUID,
            title: String,
            description: String?,
            meetAt: Instant,
            place: String,
            placeUrl: String?,
            capacity: Int,
            fee: Int,
            feeFemale: Int?,
            genderLimit: String?,
            minAgeMale: Int?,
            maxAgeMale: Int?,
            minAgeFemale: Int?,
            maxAgeFemale: Int?,
            minHeightMaleCm: Int?,
            minHeightFemaleCm: Int?,
            requireJobVerified: Boolean,
            emoji: String?,
            color: String?,
            coverUrls: List<String>,
            kakaoLink: String,
            status: MeetupStatus,
            createdAt: Instant,
        ): Meetup = Meetup(
            id, hostAccountId, title, description, meetAt, place, placeUrl, capacity, fee,
            feeFemale, genderLimit,
            minAgeMale, maxAgeMale, minAgeFemale, maxAgeFemale, minHeightMaleCm, minHeightFemaleCm,
            requireJobVerified, emoji, color, coverUrls, kakaoLink, status, createdAt,
        )

        private fun validateConditions(minAge: Int?, maxAge: Int?, minHeightCm: Int?) {
            if (minAge != null && minAge < 19) throw DailyMeetException("나이 제한은 19세부터예요")
            if (maxAge != null && maxAge > 100) throw DailyMeetException("나이 제한이 올바르지 않아요")
            if (minAge != null && maxAge != null && minAge > maxAge) throw DailyMeetException("나이 범위가 뒤집혔어요")
            if (minHeightCm != null && (minHeightCm < 140 || minHeightCm > 210)) {
                throw DailyMeetException("키 제한은 140~210cm 사이여야 해요")
            }
        }
    }
}

/** 신청의 상태 — 신청(APPLIED) → 모임장이 확정(CONFIRMED)/거절(DECLINED), 또는 신청자가 취소(CANCELED). */
enum class MeetupApplicationStatus { APPLIED, CONFIRMED, DECLINED, CANCELED }

/**
 * 모임 신청 — 회원이 앱에서 남기는 손들기.
 * 확정은 모임장이 카카오에서 입금을 확인한 뒤 웹 콘솔에서 찍는다.
 */
class MeetupApplication private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val meetupId: UUID,
    val applicantAccountId: UUID,
    status: MeetupApplicationStatus,
    val createdAt: Instant,
    updatedAt: Instant,
) {
    var status: MeetupApplicationStatus = status
        private set
    var updatedAt: Instant = updatedAt
        private set

    /** 모임장이 입금을 확인하고 자리를 확정한다. */
    fun confirm(now: Instant = Instant.now()) {
        if (status == MeetupApplicationStatus.CANCELED) throw DailyMeetException("신청자가 취소한 신청이에요")
        status = MeetupApplicationStatus.CONFIRMED
        updatedAt = now
    }

    /** 모임장이 거절한다 — 정원 초과 등. */
    fun decline(now: Instant = Instant.now()) {
        if (status == MeetupApplicationStatus.CANCELED) throw DailyMeetException("신청자가 취소한 신청이에요")
        status = MeetupApplicationStatus.DECLINED
        updatedAt = now
    }

    /** 신청자가 스스로 물린다 — 확정 뒤에도 가능(모임장이 목록에서 본다). */
    fun cancelByApplicant(now: Instant = Instant.now()) {
        status = MeetupApplicationStatus.CANCELED
        updatedAt = now
    }

    /** 취소했던 신청을 되살린다 — 같은 모임에 다시 손드는 경우(행이 유일 제약이라 새로 만들 수 없다). */
    fun reapply(now: Instant = Instant.now()) {
        if (status != MeetupApplicationStatus.CANCELED) throw DailyMeetException("이미 신청한 모임이에요")
        status = MeetupApplicationStatus.APPLIED
        updatedAt = now
    }

    companion object {
        fun apply(meetupId: UUID, applicantAccountId: UUID, now: Instant = Instant.now()): MeetupApplication =
            MeetupApplication(null, meetupId, applicantAccountId, MeetupApplicationStatus.APPLIED, now, now)

        fun reconstitute(
            id: UUID,
            meetupId: UUID,
            applicantAccountId: UUID,
            status: MeetupApplicationStatus,
            createdAt: Instant,
            updatedAt: Instant,
        ): MeetupApplication = MeetupApplication(id, meetupId, applicantAccountId, status, createdAt, updatedAt)
    }
}
