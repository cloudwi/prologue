package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/** 모임의 상태 — 모집 중(OPEN) → 모집 마감(CLOSED) → 개최 완료(DONE), 또는 취소(CANCELED). */
/**
 * 모임의 상태.
 *
 * [PENDING]은 **모든 모임이 거쳐야 하는 문**이다(2026-08-28). 모임장이 만들면 여기서
 * 시작하고, 운영자가 승인해야 [OPEN]이 되어 앱 목록에 실린다. 오프라인 모임은 사고가
 * 앱 밖에서 나고 책임은 우리에게 오므로, 처음 몇 번은 사람이 읽어보는 편이 낫다.
 *
 * [REJECTED]는 되돌릴 수 있는 상태다 — 모임장이 고쳐서 다시 올리면 [PENDING]으로 간다.
 * [CANCELED]와 다르다: 취소는 열렸던 모임이 무산된 것이고, 반려는 아직 열린 적이 없다.
 */
enum class MeetupStatus { PENDING, REJECTED, OPEN, CLOSED, DONE, CANCELED }

/**
 * 후기의 상태 — 모임 상태와 따로 돈다.
 *
 * 끝난 모임을 심사 대기로 되돌릴 수는 없다. 개최된 사실은 심사할 것이 아니고, 심사할 것은
 * 그 뒤에 붙는 글이다. 그래서 [MeetupStatus]와 나란히 두 번째 상태를 둔다.
 *
 * [NONE]은 아직 쓰지 않았다는 뜻이고, 후기를 지우면 다시 여기로 돌아온다.
 * 고쳐 쓰면 [PENDING]이 된다 — 승인은 그때 읽은 그 글에 준 것이다.
 */
enum class RecapStatus { NONE, PENDING, APPROVED, REJECTED }

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
    /**
     * 회차 묶음. 같은 모임이 다시 열리면 같은 값을 단다("밑줄 모임 3번째 만남").
     *
     * 행 id와 따로 두는 이유: 회차를 잇는 주체는 "첫 모임 행"이 아니라 모임 그 자체다.
     * 첫 회차를 지워도 나머지 회차가 서로를 잃지 않아야 한다.
     * 단발 모임은 자기 혼자짜리 회차다 — 값이 없는 모임은 없다.
     */
    val seriesId: UUID,
    val hostAccountId: UUID,
    val title: String,
    val description: String?,
    val meetAt: Instant,
    val place: String,
    /** 지도 링크(구버전 호환) — 새 데이터는 placeAddress로 링크를 만든다. */
    val placeUrl: String?,
    /** 도로명 주소(주소 검색 결과) — 네이버·카카오 지도 링크의 원료. */
    val placeAddress: String?,
    val capacity: Int,
    /**
     * 성별로 나눈 정원. 둘 다 있거나 둘 다 없다 — 한쪽만 정한 자리는 나눈 것도 안 나눈 것도 아니다.
     * 나눈 모임에서는 [capacity]가 두 값의 합이다.
     */
    val capacityMale: Int?,
    val capacityFemale: Int?,
    /**
     * 확정을 기다리는 줄의 길이. null이면 제한 없음.
     *
     * 여덟 자리에 마흔 명이 손을 들면 서른두 명은 언젠가 거절당할 사람이다. 그걸 알면서 계속
     * 받는 건 기다리게 하는 것이 아니라 속이는 것에 가깝다.
     */
    val waitlistCapacity: Int?,
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
    /**
     * 소개 글 사이에 놓는 사진.
     *
     * 커버와 나눠 두는 이유는 역할이 달라서다. 커버는 표지라 카드에 걸리고, 이쪽은 글의
     * 흐름 속에 놓여야 뜻이 사는 사진이다("이 서점에서 만나요"). 한 목록에 섞으면
     * 무엇이 카드의 얼굴이 될지 모임장이 알 수 없다.
     *
     * 소개 글의 `[사진N]` 표시가 이 목록의 N번째를 가리킨다.
     */
    val bodyImageUrls: List<String>,
    val kakaoLink: String,
    status: MeetupStatus,
    reviewNote: String?,
    val createdAt: Instant,
    /*
     * 후기는 생성자 뒤쪽에 둔다.
     *
     * 앞에 끼워 넣으면 create·update·reconstitute의 자리 인자가 전부 밀린다. 뒤에 기본값과
     * 함께 두면 지금 있는 호출은 한 글자도 바뀌지 않는다 — 후기가 없던 시절의 모임은
     * 그대로 후기가 없는 모임이 된다.
     */
    recap: String? = null,
    recapImageUrls: List<String> = emptyList(),
    recapStatus: RecapStatus = RecapStatus.NONE,
    recapReviewNote: String? = null,
) {
    var status: MeetupStatus = status
        private set

    /**
     * 심사 결과를 적어 두는 자리 — 반려 사유. 모임장이 무엇을 고쳐야 하는지 알아야 한다.
     * "부적절합니다"로 끝나면 같은 모임이 그대로 다시 올라온다.
     */
    var reviewNote: String? = reviewNote
        private set

    /** 승인 — 이제야 앱 목록에 실린다. */
    fun approve() {
        if (status != MeetupStatus.PENDING) throw DailyMeetException("심사 중인 모임만 승인할 수 있어요")
        status = MeetupStatus.OPEN
        reviewNote = null
    }

    /** 반려 — 사유를 반드시 남긴다. */
    fun reject(reason: String) {
        if (status != MeetupStatus.PENDING) throw DailyMeetException("심사 중인 모임만 반려할 수 있어요")
        val clean = reason.trim()
        if (clean.isBlank()) throw DailyMeetException("반려 사유를 적어주세요")
        if (clean.length > REVIEW_NOTE_MAX) throw DailyMeetException("반려 사유는 ${REVIEW_NOTE_MAX}자 이하여야 해요")
        status = MeetupStatus.REJECTED
        reviewNote = clean
    }

    /**
     * 내용을 고치면 다시 심사를 받는다.
     *
     * 승인은 **그때 읽은 그 글**에 준 것이다. 승인 뒤에 소개와 장소를 전부 바꿔치기할 수
     * 있으면 심사는 형식이 된다. 이미 열려 신청자가 붙은 모임도 마찬가지다 —
     * 다시 문을 닫고 사람이 읽는다.
     */
    fun sendBackToReview() {
        if (status == MeetupStatus.DONE || status == MeetupStatus.CANCELED) return
        status = MeetupStatus.PENDING
        reviewNote = null
    }

    /**
     * 모임 후기 — 끝난 뒤에 남기는 기록.
     *
     * 소개와 같은 평문+표시 문법이다(`[사진1]`, `[사진1:50:1200x900]`). 그래서 콘솔의 편집기도
     * 초대장의 조판도 그대로 쓴다. 표시가 가리키는 사진은 [recapImageUrls]에 담긴다.
     */
    var recap: String? = recap
        private set
    var recapImageUrls: List<String> = recapImageUrls
        private set
    var recapStatus: RecapStatus = recapStatus
        private set
    var recapReviewNote: String? = recapReviewNote
        private set

    /**
     * 후기를 쓰거나 고친다.
     *
     * **개최 완료된 모임에만** 쓸 수 있다. 열리지도 않은 모임의 후기는 후기가 아니라 예고이고,
     * 그건 소개 글이 할 일이다.
     *
     * 쓰면 심사로 들어간다. 고쳐 써도 마찬가지다 — 승인은 그때 읽은 그 글에 준 것이라,
     * 승인 뒤에 통째로 바꿔치기할 수 있으면 심사는 형식이 된다. 모임 본문과 같은 규칙이다.
     *
     * 글도 사진도 비우면 후기를 지운 것이다. 심사 대기로 남겨두면 볼 것이 없는 줄이
     * 운영자의 심사 목록에 영원히 남는다.
     */
    fun writeRecap(text: String?, imageUrls: List<String>) {
        if (status != MeetupStatus.DONE) {
            throw DailyMeetException("개최 완료로 남긴 모임에만 후기를 쓸 수 있어요")
        }
        val clean = text?.trim()?.ifBlank { null }
        if ((clean?.length ?: 0) > RECAP_MAX) throw DailyMeetException("후기는 ${RECAP_MAX}자 이하여야 해요")
        val images = imageUrls.map { it.trim() }.filter { it.isNotBlank() }
        if (images.size > BODY_IMAGE_MAX) throw DailyMeetException("후기 사진은 ${BODY_IMAGE_MAX}장까지예요")
        if (images.any { !it.startsWith("https://") || it.length > 500 }) {
            throw DailyMeetException("후기 사진 주소가 올바르지 않아요")
        }
        recap = clean
        recapImageUrls = images
        recapStatus = if (clean == null && images.isEmpty()) RecapStatus.NONE else RecapStatus.PENDING
        recapReviewNote = null
    }

    /** 후기 승인 — 이제야 앱과 초대장에 실린다. */
    fun approveRecap() {
        if (recapStatus != RecapStatus.PENDING) throw DailyMeetException("심사 중인 후기만 승인할 수 있어요")
        recapStatus = RecapStatus.APPROVED
        recapReviewNote = null
    }

    /** 후기 반려 — 사유를 반드시 남긴다. 무엇을 고쳐야 하는지 모르면 같은 글이 그대로 다시 올라온다. */
    fun rejectRecap(reason: String) {
        if (recapStatus != RecapStatus.PENDING) throw DailyMeetException("심사 중인 후기만 반려할 수 있어요")
        val clean = reason.trim()
        if (clean.isBlank()) throw DailyMeetException("반려 사유를 적어주세요")
        if (clean.length > REVIEW_NOTE_MAX) throw DailyMeetException("반려 사유는 ${REVIEW_NOTE_MAX}자 이하여야 해요")
        recapStatus = RecapStatus.REJECTED
        recapReviewNote = clean
    }

    /** 남에게 보여도 되는 후기인가 — 승인됐고, 보여줄 것이 있는가. */
    fun hasPublicRecap(): Boolean =
        recapStatus == RecapStatus.APPROVED && (recap != null || recapImageUrls.isNotEmpty())

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
    /**
     * 개최 완료로 남긴다 — 모임장의 공개 기록(개최 횟수)이 되는 순간.
     *
     * 그 숫자는 초대장 표지와 모임장 프로필에 **신뢰 신호**로 걸린다. 그래서 아무 때나 눌러서는 안 된다:
     * 빈 모임을 만들어 바로 완료를 누르면 평판이 공짜로 쌓인다. 지금은 운영자만 모임을 열어 무해하지만,
     * 개설을 모두에게 여는 순간 조작 가능한 숫자가 되고, 그때는 이미 쌓인 기록에서 진짜를 가려내야 한다(2026-08-25).
     *
     * 두 조건: **모임 시각이 지났고**, **확정된 참가자가 하나라도 있어야** 한다.
     * 아무도 오지 않은 자리는 열린 적 없는 것과 같다.
     */
    fun complete(confirmedCount: Int, now: Instant = Instant.now()) {
        if (status == MeetupStatus.DONE) return // 멱등
        if (status == MeetupStatus.CANCELED) throw DailyMeetException("취소된 모임이에요")
        if (now.isBefore(meetAt)) throw DailyMeetException("아직 열리지 않은 모임이에요. 모임 시각이 지난 뒤에 완료로 남겨주세요.")
        if (confirmedCount < 1) {
            throw DailyMeetException("확정된 참가자가 있어야 개최 기록으로 남길 수 있어요. 참가자를 먼저 확정해주세요.")
        }
        status = MeetupStatus.DONE
    }

    /** 취소 — 열리지 못한 모임. 히스토리에 남지 않는다. */
    fun cancel() {
        if (status == MeetupStatus.DONE) throw DailyMeetException("이미 개최된 모임이에요")
        status = MeetupStatus.CANCELED
    }

    /** 지금 신청을 받을 수 있는지. */
    fun isOpen(): Boolean = status == MeetupStatus.OPEN

    /** 성별로 자리를 나눈 모임인지. */
    fun hasSplitSeats(): Boolean = capacityMale != null && capacityFemale != null

    /** [gender] 자리의 정원. 나누지 않았으면 통합 정원을 돌려준다. */
    fun seatsFor(gender: String?): Int = when {
        !hasSplitSeats() -> capacity
        gender == "MALE" -> capacityMale!!
        gender == "FEMALE" -> capacityFemale!!
        // 성별을 모르는 회원(옛 데이터)은 나눈 자리에 앉힐 수 없다.
        else -> 0
    }

    /**
     * 손을 들 수 있는지 — 대기 줄이 아직 남았는가.
     *
     * [waiting]은 지금 확정을 기다리는 사람 수다. 신청은 별개 애그리거트라 도메인이 셀 수 없어
     * 세어서 넘긴다([complete]와 같은 방식).
     */
    fun checkCanApply(waiting: Int) {
        if (waitlistCapacity == null) return
        if (waiting >= waitlistCapacity) {
            throw DailyMeetException("신청이 많아 대기가 가득 찼어요. 다음 회차를 기다려주세요.")
        }
    }

    /**
     * 확정할 수 있는지 — 그 자리가 아직 남았는가.
     *
     * 지금까지 확정에는 정원 검사가 아예 없었다. 여덟 자리 모임에 스무 명을 확정해도 서버는
     * 아무 말도 하지 않았고, 넘친 사실은 당일 현장에서 드러났다.
     *
     * [confirmedInSameSeat]은 같은 자리(나눈 모임이면 같은 성별)에 이미 확정된 사람 수다.
     */
    fun checkCanConfirm(confirmedInSameSeat: Int, gender: String?) {
        val seats = seatsFor(gender)
        if (hasSplitSeats() && seats == 0) {
            throw DailyMeetException("이 모임은 성별로 자리를 나눠 받아요. 프로필에 성별이 없는 분은 확정할 수 없어요.")
        }
        if (confirmedInSameSeat >= seats) {
            val where = if (hasSplitSeats()) (if (gender == "MALE") "남성 자리가" else "여성 자리가") else "자리가"
            throw DailyMeetException("$where 모두 찼어요. 정원을 늘리거나 다른 분의 확정을 취소해주세요.")
        }
    }

    companion object {
        private const val TITLE_MAX = 80
        private const val DESCRIPTION_MAX = 1000
        private const val PLACE_MAX = 120
        private const val KAKAO_LINK_MAX = 300
        private const val CAPACITY_MIN = 2
        private const val CAPACITY_MAX = 100
        /**
         * 커버 사진의 최대 장수.
         *
         * 커버는 표지다 — 모임 탭 카드의 얼굴이자 초대장 맨 위 한 장. 그 역할에는 세 장이면 넉넉하다.
         * 글 사이에 놓을 사진은 여기가 아니라 [BODY_IMAGE_MAX] 쪽이다.
         */
        private const val COVER_MAX = 3

        /** 소개 글 안에 놓는 사진의 최대 장수. 글이 길어질 수 있으니 커버보다 넉넉히 둔다. */
        private const val BODY_IMAGE_MAX = 10

        /** 대기 줄의 최대 길이 — 이보다 길면 기다림이 아니라 방치다. */
        private const val WAITLIST_MAX = 200
        private const val REVIEW_NOTE_MAX = 300

        /** 후기 글의 최대 길이 — 소개와 같다. 읽는 자리도, 조판도 같으니 길이만 다를 이유가 없다. */
        private const val RECAP_MAX = 1000

        fun create(
            hostAccountId: UUID,
            title: String,
            description: String?,
            meetAt: Instant,
            place: String,
            placeUrl: String?,
            placeAddress: String?,
            capacity: Int,
            capacityMale: Int? = null,
            capacityFemale: Int? = null,
            waitlistCapacity: Int? = null,
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
            bodyImageUrls: List<String> = emptyList(),
            kakaoLink: String,
            /** 이어 여는 회차면 그 모임의 seriesId. null이면 새 모임(자기 혼자짜리 회차). */
            seriesId: UUID? = null,
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
            validateSeats(capacity, capacityMale, capacityFemale, waitlistCapacity)
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
            val cleanPlaceAddress = placeAddress?.trim()?.ifBlank { null }
            if (cleanPlaceAddress != null && cleanPlaceAddress.length > 200) throw DailyMeetException("주소가 너무 길어요")
            val cleanPlaceUrl = placeUrl?.trim()?.ifBlank { null }
            if (cleanPlaceUrl != null && (!cleanPlaceUrl.startsWith("https://") || cleanPlaceUrl.length > 500)) {
                throw DailyMeetException("지도 링크가 올바르지 않아요")
            }
            val cleanCovers = coverUrls.map { it.trim() }.filter { it.isNotBlank() }
            if (cleanCovers.size > COVER_MAX) throw DailyMeetException("커버 사진은 ${COVER_MAX}장까지예요")
            if (cleanCovers.any { !it.startsWith("https://") || it.length > 500 }) {
                throw DailyMeetException("커버 사진 주소가 올바르지 않아요")
            }
            val cleanBodyImages = bodyImageUrls.map { it.trim() }.filter { it.isNotBlank() }
            if (cleanBodyImages.size > BODY_IMAGE_MAX) {
                throw DailyMeetException("소개 사진은 ${BODY_IMAGE_MAX}장까지예요")
            }
            if (cleanBodyImages.any { !it.startsWith("https://") || it.length > 500 }) {
                throw DailyMeetException("소개 사진 주소가 올바르지 않아요")
            }
            if (meetAt.isBefore(now)) throw DailyMeetException("모임 일시는 미래여야 해요")
            val cleanLink = kakaoLink.trim()
            // 신청자에게만 내려가는 링크 — 형태만 죈다(오픈채팅이 아닌 https 링크도 허용).
            if (!cleanLink.startsWith("https://")) throw DailyMeetException("카카오 오픈채팅 링크(https://)를 넣어주세요")
            if (cleanLink.length > KAKAO_LINK_MAX) throw DailyMeetException("링크가 너무 길어요")
            return Meetup(
                null, seriesId ?: UUID.randomUUID(), hostAccountId, cleanTitle, cleanDescription, meetAt, cleanPlace, cleanPlaceUrl, cleanPlaceAddress,
                capacity, capacityMale, capacityFemale, waitlistCapacity, fee, feeFemale, genderLimit,
                minAgeMale, maxAgeMale, minAgeFemale, maxAgeFemale, minHeightMaleCm, minHeightFemaleCm,
                requireJobVerified, cleanEmoji, cleanColor, cleanCovers, cleanBodyImages, cleanLink,
                // 새 모임은 언제나 심사부터 — 승인 전에는 목록에 실리지 않는다.
                MeetupStatus.PENDING, null, now,
            )
        }

        /**
         * 모임 수정 — 내용은 create와 같은 검증을 거치고, 정체성(id·모임장·상태·생성 시각)은 유지한다.
         * 취소·완료된 모임은 수정할 수 없다.
         */
        fun update(
            existing: Meetup,
            title: String,
            description: String?,
            meetAt: Instant,
            place: String,
            placeUrl: String?,
            placeAddress: String?,
            capacity: Int,
            capacityMale: Int? = null,
            capacityFemale: Int? = null,
            waitlistCapacity: Int? = null,
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
            bodyImageUrls: List<String> = emptyList(),
            kakaoLink: String,
        ): Meetup {
            if (existing.status == MeetupStatus.DONE || existing.status == MeetupStatus.CANCELED) {
                throw DailyMeetException("끝난 모임은 수정할 수 없어요")
            }
            val fresh = create(
                existing.hostAccountId, title, description, meetAt, place, placeUrl, placeAddress,
                capacity, capacityMale, capacityFemale, waitlistCapacity, fee, feeFemale, genderLimit,
                minAgeMale, maxAgeMale, minAgeFemale, maxAgeFemale, minHeightMaleCm, minHeightFemaleCm,
                requireJobVerified, emoji, color, coverUrls, bodyImageUrls, kakaoLink,
            )
            return Meetup(
                // 수정은 회차를 옮기지 않는다 — 회차를 잇는 건 '다시 열기'뿐이다.
                existing.id, existing.seriesId, existing.hostAccountId, fresh.title, fresh.description, fresh.meetAt,
                fresh.place, fresh.placeUrl, fresh.placeAddress,
                fresh.capacity, fresh.capacityMale, fresh.capacityFemale, fresh.waitlistCapacity,
                fresh.fee, fresh.feeFemale, fresh.genderLimit,
                fresh.minAgeMale, fresh.maxAgeMale, fresh.minAgeFemale, fresh.maxAgeFemale,
                fresh.minHeightMaleCm, fresh.minHeightFemaleCm,
                fresh.requireJobVerified, fresh.emoji, fresh.color, fresh.coverUrls, fresh.bodyImageUrls,
                // 고친 모임은 다시 심사를 받는다 — 승인은 그때 읽은 그 글에 준 것이다.
                fresh.kakaoLink, MeetupStatus.PENDING, null, existing.createdAt,
            )
        }

        fun reconstitute(
            id: UUID,
            seriesId: UUID,
            hostAccountId: UUID,
            title: String,
            description: String?,
            meetAt: Instant,
            place: String,
            placeUrl: String?,
            placeAddress: String?,
            capacity: Int,
            capacityMale: Int? = null,
            capacityFemale: Int? = null,
            waitlistCapacity: Int? = null,
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
            bodyImageUrls: List<String> = emptyList(),
            kakaoLink: String,
            status: MeetupStatus,
            reviewNote: String? = null,
            createdAt: Instant,
            recap: String? = null,
            recapImageUrls: List<String> = emptyList(),
            recapStatus: RecapStatus = RecapStatus.NONE,
            recapReviewNote: String? = null,
        ): Meetup = Meetup(
            id, seriesId, hostAccountId, title, description, meetAt, place, placeUrl, placeAddress,
            capacity, capacityMale, capacityFemale, waitlistCapacity, fee, feeFemale, genderLimit,
            minAgeMale, maxAgeMale, minAgeFemale, maxAgeFemale, minHeightMaleCm, minHeightFemaleCm,
            requireJobVerified, emoji, color, coverUrls, bodyImageUrls, kakaoLink, status, reviewNote, createdAt,
            recap, recapImageUrls, recapStatus, recapReviewNote,
        )

        /**
         * 나눈 자리와 대기 줄의 규칙.
         *
         * 한쪽만 정한 정원은 받지 않는다 — "남 4명, 여자는 몇 명이든"은 정원이 아니라 소원이다.
         * 나눴다면 합이 곧 전체 정원이어야 한다. 둘이 어긋나면 어느 쪽을 믿을지 정할 수 없다.
         */
        private fun validateSeats(capacity: Int, male: Int?, female: Int?, waitlist: Int?) {
            if ((male == null) != (female == null)) {
                throw DailyMeetException("성별로 나눈 정원은 남성·여성 모두 정해야 해요")
            }
            if (male != null && female != null) {
                if (male < 0 || female < 0) throw DailyMeetException("정원은 0명 이상이어야 해요")
                if (male + female != capacity) throw DailyMeetException("남성·여성 정원의 합이 전체 정원과 달라요")
            }
            if (waitlist != null && (waitlist < 0 || waitlist > WAITLIST_MAX)) {
                throw DailyMeetException("대기 인원은 0~${WAITLIST_MAX}명으로 정할 수 있어요")
            }
        }

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
