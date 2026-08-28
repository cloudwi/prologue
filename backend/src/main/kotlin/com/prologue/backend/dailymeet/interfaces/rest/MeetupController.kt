package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.HostMeetupView
import com.prologue.backend.dailymeet.application.service.MeetupCoverService
import com.prologue.backend.dailymeet.application.service.MeetupMemberProfileView
import com.prologue.backend.dailymeet.application.service.MeetupHistoryView
import com.prologue.backend.dailymeet.application.service.MeetupService
import com.prologue.backend.dailymeet.application.service.MeetupView
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

/**
 * 오프라인 모임 — 회원(앱)용. 인증 필요(JWT).
 *
 * 누구나 모임을 열 수 있다(모임장 = 만든 사람). 신청·취소는 참가자로서,
 * 만들기·확정·마감·취소는 모임장으로서 — 소유권 검사는 서비스가 한다.
 * 입금과 대화는 모임장의 카카오 오픈채팅에서.
 */
@RestController
@RequestMapping("/meetups")
class MeetupController(
    private val meetupService: MeetupService,
    private val meetupCoverService: MeetupCoverService,
) {
    data class CoverUploadResponse(val url: String)

    /** 커버 사진 업로드 — 모임 생성 전에 올리고 URL을 생성 요청에 싣는다. 선정성 검사만 건다. */
    @PostMapping("/cover", consumes = [org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadCover(
        authentication: Authentication,
        @org.springframework.web.bind.annotation.RequestParam("file") file: org.springframework.web.multipart.MultipartFile,
    ): CoverUploadResponse {
        if (file.isEmpty) throw DailyMeetException("이미지 파일이 비어 있습니다")
        return CoverUploadResponse(meetupCoverService.upload(UUID.fromString(authentication.name), file.bytes))
    }

    /**
     * [canCreate] — 이 사람이 모임을 열 수 있는지. 앱이 '모임 열기' 버튼을 그릴지 정한다.
     * 옛 앱은 이 필드를 모르고 버튼을 늘 그리지만, 눌러도 서버가 거절한다(가산적 변경).
     */
    data class MeetupsResponse(val meetups: List<MeetupView>, val canCreate: Boolean = false)
    data class MeetupHistoryResponse(val meetups: List<MeetupHistoryView>)
    /**
     * [canCreate] — 이 사람이 모임을 열 수 있는지.
     *
     * 콘솔이 '새 모임' 단추를 그릴지 정한다. 이게 없으면 열 수 없는 사람이 폼을 다 채우고
     * **저장할 때야** 거절당한다 — 못 하는 일은 하기 전에 말해야 한다.
     */
    data class MyMeetupsResponse(val meetups: List<HostMeetupView>, val canCreate: Boolean = false)

    data class CreateMeetupRequest(
        @field:NotBlank(message = "모임 이름을 적어주세요")
        val title: String,
        val description: String? = null,
        /** ISO-8601 (예: 2026-09-05T19:00:00+09:00). */
        @field:NotBlank(message = "모임 일시가 필요해요")
        val meetAt: String,
        @field:NotBlank(message = "모임 장소를 적어주세요")
        val place: String,
        /** 지도 링크(선택, 구버전 호환) — 새 앱은 placeAddress를 보낸다. */
        val placeUrl: String? = null,
        /** 도로명 주소(주소 검색 결과) — 지도 링크의 원료. */
        val placeAddress: String? = null,
        @field:Min(value = 2, message = "정원은 2명 이상이어야 해요")
        @field:Max(value = 100, message = "정원은 100명까지예요")
        val capacity: Int,
        /**
         * 성별로 나눈 정원(선택). 둘 다 보내거나 둘 다 보내지 않는다 — 합이 [capacity]와 같아야 한다.
         * 옛 앱은 보내지 않으므로 나누지 않은 모임이 된다(가산적 변경).
         */
        val capacityMale: Int? = null,
        val capacityFemale: Int? = null,
        /** 확정을 기다리는 줄의 길이(선택). null이면 제한 없음. */
        val waitlistCapacity: Int? = null,
        @field:Min(value = 0, message = "참가비는 0원 이상이어야 해요")
        val fee: Int = 0,
        /** 여성 참가비 — 성별에 따라 값을 달리 받는 모임. null이면 fee(공통). */
        @field:Min(value = 0, message = "여성 참가비는 0원 이상이어야 해요")
        val feeFemale: Int? = null,
        /** 참가 조건(선택) — 성별 제한, 성별별 나이 범위·최소 키. 검증은 도메인이 한다. */
        val genderLimit: String? = null,
        val minAgeMale: Int? = null,
        val maxAgeMale: Int? = null,
        val minAgeFemale: Int? = null,
        val maxAgeFemale: Int? = null,
        val minHeightMaleCm: Int? = null,
        val minHeightFemaleCm: Int? = null,
        /** 직장 인증 필수(선택). */
        val requireJobVerified: Boolean = false,
        /** 커버(선택) — 표지로 쓰는 사진(첫 장이 카드의 얼굴, 최대 3장). */
        val emoji: String? = null,
        val color: String? = null,
        val coverUrls: List<String> = emptyList(),
        /** 소개 글 안에 놓는 사진(선택, 최대 10장). 소개의 `[사진N]` 표시가 가리킨다. */
        val bodyImageUrls: List<String> = emptyList(),
        @field:NotBlank(message = "카카오 오픈채팅 링크를 넣어주세요")
        val kakaoLink: String,
        /**
         * 이어 여는 회차면 그 모임의 seriesId('이 모임 다시 열기').
         * 없으면 새 모임 — 자기 혼자짜리 회차로 시작한다.
         */
        val seriesId: String? = null,
    )

    data class CreateMeetupResponse(val meetupId: String)

    /**
     * 다가오는 모임 — 가까운 날짜순. 내 신청 상태와 (신청자에게만) 카카오 링크가 담긴다.
     *
     * **로그인 없이도 답한다.** 모임은 이 앱에서 유일하게 문 밖에서 들여다볼 수 있는 방이다 —
     * 어떤 자리가 열려 있는지 보고 나서 가입할지 정하게 하려는 것이다. 손을 들려면 그때 가입한다.
     */
    @GetMapping
    fun upcoming(authentication: Authentication?): MeetupsResponse {
        val accountId = accountIdOrNull(authentication)
        return MeetupsResponse(
            meetupService.upcoming(accountId),
            canCreate = accountId != null && meetupService.canHost(accountId),
        )
    }

    /** 지난 모임 — 개최 완료 기록. 모임이 얼마나 잘 굴러가는지의 공개 신호. */
    @GetMapping("/history")
    fun history(): MeetupHistoryResponse = MeetupHistoryResponse(meetupService.history())

    /** 모임 멤버 프로필 — 프로필과 모임 이력까지만 공개. 문답·편지는 응답에 없다. */
    @GetMapping("/members/{accountId}")
    fun memberProfile(@PathVariable accountId: String): MeetupMemberProfileView =
        meetupService.memberProfile(parseId(accountId))

    // ── 참가자로서 ──

    /** 손들기 — 신청하면 모임장 오픈채팅 링크가 열린다. */
    @PostMapping("/{meetupId}/apply")
    fun apply(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.apply(UUID.fromString(authentication.name), parseId(meetupId))
    }

    /**
     * 모임 따라가기 — 다음 회차가 열리면 알림을 받는다.
     * 따라가는 대상은 이 회차가 아니라 모임 자체라, 오늘 모임이 끝나도 구독은 남는다.
     */
    @PostMapping("/{meetupId}/follow")
    fun follow(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.follow(UUID.fromString(authentication.name), parseId(meetupId), on = true)
    }

    /** 따라가기 끄기. */
    @PostMapping("/{meetupId}/unfollow")
    fun unfollow(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.follow(UUID.fromString(authentication.name), parseId(meetupId), on = false)
    }

    /** 신청 취소. */
    @PostMapping("/{meetupId}/cancel")
    fun cancel(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.cancel(UUID.fromString(authentication.name), parseId(meetupId))
    }

    // ── 모임장으로서 ──

    /** 모임 열기 — 누구나. 만든 사람이 곧 모임장이다. */
    @PostMapping
    fun create(authentication: Authentication, @Valid @RequestBody request: CreateMeetupRequest): CreateMeetupResponse {
        val meetAt = try {
            Instant.parse(request.meetAt)
        } catch (e: java.time.format.DateTimeParseException) {
            throw DailyMeetException("모임 일시 형식이 올바르지 않아요")
        }
        if (meetAt.isBefore(Instant.now())) throw DailyMeetException("지난 시각으로는 모임을 열 수 없어요")
        val id = meetupService.create(
            hostAccountId = UUID.fromString(authentication.name),
            title = request.title,
            description = request.description,
            meetAt = meetAt,
            place = request.place,
            placeUrl = request.placeUrl,
            placeAddress = request.placeAddress,
            capacity = request.capacity,
            capacityMale = request.capacityMale,
            capacityFemale = request.capacityFemale,
            waitlistCapacity = request.waitlistCapacity,
            fee = request.fee,
            feeFemale = request.feeFemale,
            genderLimit = request.genderLimit,
            minAgeMale = request.minAgeMale,
            maxAgeMale = request.maxAgeMale,
            minAgeFemale = request.minAgeFemale,
            maxAgeFemale = request.maxAgeFemale,
            minHeightMaleCm = request.minHeightMaleCm,
            minHeightFemaleCm = request.minHeightFemaleCm,
            requireJobVerified = request.requireJobVerified,
            emoji = request.emoji,
            color = request.color,
            coverUrls = request.coverUrls,
            bodyImageUrls = request.bodyImageUrls,
            kakaoLink = request.kakaoLink,
            seriesId = request.seriesId?.let { parseId(it) },
        )
        return CreateMeetupResponse(id.toString())
    }

    /** 모임 수정 — 모임장 본인만. 생성과 같은 본문을 받는다. */
    @org.springframework.web.bind.annotation.PutMapping("/{meetupId}")
    fun update(
        authentication: Authentication,
        @PathVariable meetupId: String,
        @Valid @RequestBody request: CreateMeetupRequest,
    ) {
        val meetAt = try {
            Instant.parse(request.meetAt)
        } catch (e: java.time.format.DateTimeParseException) {
            throw DailyMeetException("모임 일시 형식이 올바르지 않아요")
        }
        if (meetAt.isBefore(Instant.now())) throw DailyMeetException("지난 시각으로는 모임을 열 수 없어요")
        meetupService.updateMeetup(
            hostAccountId = UUID.fromString(authentication.name),
            meetupId = parseId(meetupId),
            title = request.title,
            description = request.description,
            meetAt = meetAt,
            place = request.place,
            placeUrl = request.placeUrl,
            placeAddress = request.placeAddress,
            capacity = request.capacity,
            capacityMale = request.capacityMale,
            capacityFemale = request.capacityFemale,
            waitlistCapacity = request.waitlistCapacity,
            fee = request.fee,
            feeFemale = request.feeFemale,
            genderLimit = request.genderLimit,
            minAgeMale = request.minAgeMale,
            maxAgeMale = request.maxAgeMale,
            minAgeFemale = request.minAgeFemale,
            maxAgeFemale = request.maxAgeFemale,
            minHeightMaleCm = request.minHeightMaleCm,
            minHeightFemaleCm = request.minHeightFemaleCm,
            requireJobVerified = request.requireJobVerified,
            emoji = request.emoji,
            color = request.color,
            coverUrls = request.coverUrls,
            bodyImageUrls = request.bodyImageUrls,
            kakaoLink = request.kakaoLink,
        )
    }

    /** 내가 여는 모임 전부 — 신청자 목록까지 한 번에. */
    @GetMapping("/mine")
    fun mine(authentication: Authentication): MyMeetupsResponse =
        UUID.fromString(authentication.name).let { id ->
            MyMeetupsResponse(meetupService.hostMeetups(id), meetupService.canHost(id))
        }

    /** 입금 확인 후 확정 — 신청자에게 푸시가 간다. */
    @PostMapping("/applications/{applicationId}/confirm")
    fun confirmApplication(authentication: Authentication, @PathVariable applicationId: String) {
        meetupService.confirmApplication(UUID.fromString(authentication.name), parseId(applicationId))
    }

    @PostMapping("/applications/{applicationId}/decline")
    fun declineApplication(authentication: Authentication, @PathVariable applicationId: String) {
        meetupService.declineApplication(UUID.fromString(authentication.name), parseId(applicationId))
    }

    @PostMapping("/{meetupId}/hosting/close")
    fun closeHosting(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.close(UUID.fromString(authentication.name), parseId(meetupId))
    }

    @PostMapping("/{meetupId}/hosting/reopen")
    fun reopenHosting(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.reopen(UUID.fromString(authentication.name), parseId(meetupId))
    }

    @PostMapping("/{meetupId}/hosting/complete")
    fun completeHosting(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.complete(UUID.fromString(authentication.name), parseId(meetupId))
    }

    /**
     * 후기 쓰기 — 개최 완료로 남긴 내 모임에.
     *
     * 소개와 같은 평문+표시 문법이라 본문 형태가 같다. 저장하면 심사로 들어가고,
     * 승인 전에는 앱에도 초대장에도 실리지 않는다.
     */
    data class RecapRequest(val recap: String?, val recapImageUrls: List<String> = emptyList())

    @org.springframework.web.bind.annotation.PutMapping("/{meetupId}/recap")
    fun writeRecap(
        authentication: Authentication,
        @PathVariable meetupId: String,
        @RequestBody request: RecapRequest,
    ) {
        meetupService.writeRecap(
            UUID.fromString(authentication.name),
            parseId(meetupId),
            request.recap,
            request.recapImageUrls,
        )
    }

    /** 모임 취소 — 신청자(신청·확정)에게 취소 푸시가 간다. */
    @PostMapping("/{meetupId}/hosting/cancel")
    fun cancelHosting(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.cancelMeetup(UUID.fromString(authentication.name), parseId(meetupId))
    }

    /**
     * 인증에서 계정을 꺼낸다. 손님이면 null.
     *
     * 스프링은 인증이 없는 요청에도 익명 토큰을 채워 넣는다 — 이름이 "anonymousUser"라
     * 그대로 UUID로 읽으면 터진다. 문을 열어둔 자리에서는 반드시 이 문을 통해 꺼낸다.
     */
    private fun accountIdOrNull(authentication: Authentication?): UUID? =
        authentication
            ?.takeIf { it.isAuthenticated && it !is AnonymousAuthenticationToken }
            ?.let { runCatching { UUID.fromString(it.name) }.getOrNull() }

    private fun parseId(raw: String): UUID = try {
        UUID.fromString(raw)
    } catch (e: IllegalArgumentException) {
        throw DailyMeetException("모임 식별자가 올바르지 않습니다")
    }
}
