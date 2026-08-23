package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.AdminMeetupView
import com.prologue.backend.dailymeet.application.service.MeetupService
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** 모임 운영 — 어드민(/admin, ROLE_ADMIN)에서 전체를 훑고 문제 모임을 취소·삭제한다. */
@RestController
@RequestMapping("/admin/meetups")
class AdminMeetupController(
    private val meetupService: MeetupService,
) {
    data class AdminMeetupsResponse(val meetups: List<AdminMeetupView>)

    @GetMapping
    fun list(): AdminMeetupsResponse = AdminMeetupsResponse(meetupService.adminMeetups())

    /** 강제 취소 — 신청자에게 취소 푸시가 간다. 기록은 남는다. */
    @PostMapping("/{meetupId}/cancel")
    fun cancel(@PathVariable meetupId: UUID) = meetupService.adminCancelMeetup(meetupId)

    /** 완전 삭제 — 부적절 모임. 커버 사진도 저장소에서 지운다. */
    @DeleteMapping("/{meetupId}")
    fun delete(@PathVariable meetupId: UUID) = meetupService.adminDeleteMeetup(meetupId)
}
