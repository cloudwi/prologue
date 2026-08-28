package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.AdminMeetupView
import com.prologue.backend.dailymeet.application.service.MeetupService
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
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

    /** 심사 승인 — 이때 비로소 앱 목록에 실린다. */
    @PostMapping("/{meetupId}/approve")
    fun approve(@PathVariable meetupId: UUID) = meetupService.approveMeetup(meetupId)

    data class RejectRequest(val reason: String)

    /** 심사 반려 — 사유는 필수다. "부적절합니다"로 끝나면 같은 모임이 그대로 다시 올라온다. */
    @PostMapping("/{meetupId}/reject")
    fun reject(@PathVariable meetupId: UUID, @RequestBody request: RejectRequest) =
        meetupService.rejectMeetup(meetupId, request.reason)

    /**
     * 후기 심사 — 승인. 이때 비로소 앱의 '지난 모임'과 초대장에 실린다.
     *
     * 모임 본문 심사와 따로 도는 이유: 끝난 모임을 심사 대기로 되돌릴 수는 없다.
     * 개최된 사실은 심사할 것이 아니고, 심사할 것은 그 뒤에 붙는 글이다.
     */
    @PostMapping("/{meetupId}/recap/approve")
    fun approveRecap(@PathVariable meetupId: UUID) = meetupService.approveRecap(meetupId)

    /** 후기 심사 — 반려. 사유는 필수다. */
    @PostMapping("/{meetupId}/recap/reject")
    fun rejectRecap(@PathVariable meetupId: UUID, @RequestBody request: RejectRequest) =
        meetupService.rejectRecap(meetupId, request.reason)

    /** 강제 취소 — 신청자에게 취소 푸시가 간다. 기록은 남는다. */
    @PostMapping("/{meetupId}/cancel")
    fun cancel(@PathVariable meetupId: UUID) = meetupService.adminCancelMeetup(meetupId)

    /** 완전 삭제 — 부적절 모임. 커버 사진도 저장소에서 지운다. */
    @DeleteMapping("/{meetupId}")
    fun delete(@PathVariable meetupId: UUID) = meetupService.adminDeleteMeetup(meetupId)
}
