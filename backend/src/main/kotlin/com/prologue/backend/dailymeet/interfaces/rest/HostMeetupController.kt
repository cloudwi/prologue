package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.HostMeetupView
import com.prologue.backend.dailymeet.application.service.MeetupService
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
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
 * 모임장 콘솔 — 웹(/host)이 쓴다. ROLE_HOST(또는 ADMIN)만.
 * 만들기 → 신청자 확인 → (카카오에서 입금 확인) → 확정/거절 → 마감 → 개최 완료.
 */
@RestController
@RequestMapping("/host/meetups")
class HostMeetupController(
    private val meetupService: MeetupService,
) {
    data class CreateMeetupRequest(
        @field:NotBlank(message = "모임 이름을 적어주세요")
        val title: String,
        val description: String? = null,
        /** ISO-8601 (예: 2026-09-05T19:00:00+09:00). */
        @field:NotBlank(message = "모임 일시가 필요해요")
        val meetAt: String,
        @field:NotBlank(message = "모임 장소를 적어주세요")
        val place: String,
        val capacity: Int,
        val fee: Int = 0,
        @field:NotBlank(message = "카카오 오픈채팅 링크를 넣어주세요")
        val kakaoLink: String,
    )

    data class CreateMeetupResponse(val meetupId: String)
    data class HostMeetupsResponse(val meetups: List<HostMeetupView>)

    @PostMapping
    fun create(authentication: Authentication, @Valid @RequestBody request: CreateMeetupRequest): CreateMeetupResponse {
        val meetAt = try {
            Instant.parse(request.meetAt)
        } catch (e: java.time.format.DateTimeParseException) {
            throw DailyMeetException("모임 일시 형식이 올바르지 않아요")
        }
        val id = meetupService.create(
            hostAccountId = UUID.fromString(authentication.name),
            title = request.title,
            description = request.description,
            meetAt = meetAt,
            place = request.place,
            capacity = request.capacity,
            fee = request.fee,
            kakaoLink = request.kakaoLink,
        )
        return CreateMeetupResponse(id.toString())
    }

    /** 내 모임 전부 — 신청자 목록까지. 콘솔은 이 하나로 그린다. */
    @GetMapping
    fun myMeetups(authentication: Authentication): HostMeetupsResponse =
        HostMeetupsResponse(meetupService.hostMeetups(UUID.fromString(authentication.name)))

    @PostMapping("/applications/{applicationId}/confirm")
    fun confirm(authentication: Authentication, @PathVariable applicationId: String) {
        meetupService.confirmApplication(UUID.fromString(authentication.name), parseId(applicationId))
    }

    @PostMapping("/applications/{applicationId}/decline")
    fun decline(authentication: Authentication, @PathVariable applicationId: String) {
        meetupService.declineApplication(UUID.fromString(authentication.name), parseId(applicationId))
    }

    @PostMapping("/{meetupId}/close")
    fun close(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.close(UUID.fromString(authentication.name), parseId(meetupId))
    }

    @PostMapping("/{meetupId}/reopen")
    fun reopen(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.reopen(UUID.fromString(authentication.name), parseId(meetupId))
    }

    @PostMapping("/{meetupId}/complete")
    fun complete(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.complete(UUID.fromString(authentication.name), parseId(meetupId))
    }

    @PostMapping("/{meetupId}/cancel")
    fun cancel(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.cancelMeetup(UUID.fromString(authentication.name), parseId(meetupId))
    }

    private fun parseId(raw: String): UUID = try {
        UUID.fromString(raw)
    } catch (e: IllegalArgumentException) {
        throw DailyMeetException("식별자가 올바르지 않습니다")
    }
}
