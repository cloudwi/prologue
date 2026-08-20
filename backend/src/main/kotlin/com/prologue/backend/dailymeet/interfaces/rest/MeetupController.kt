package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.MeetupHistoryView
import com.prologue.backend.dailymeet.application.service.MeetupService
import com.prologue.backend.dailymeet.application.service.MeetupView
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 오프라인 모임 — 회원(앱)용. 인증 필요(JWT).
 * 신청·취소만 한다. 입금과 확정은 모임장의 카카오·웹 콘솔에서.
 */
@RestController
@RequestMapping("/meetups")
class MeetupController(
    private val meetupService: MeetupService,
) {
    data class MeetupsResponse(val meetups: List<MeetupView>)
    data class MeetupHistoryResponse(val meetups: List<MeetupHistoryView>)

    /** 다가오는 모임 — 가까운 날짜순. 내 신청 상태와 (신청자에게만) 카카오 링크가 담긴다. */
    @GetMapping
    fun upcoming(authentication: Authentication): MeetupsResponse =
        MeetupsResponse(meetupService.upcoming(UUID.fromString(authentication.name)))

    /** 지난 모임 — 개최 완료 기록. 모임이 얼마나 잘 굴러가는지의 공개 신호. */
    @GetMapping("/history")
    fun history(): MeetupHistoryResponse = MeetupHistoryResponse(meetupService.history())

    /** 손들기 — 신청하면 모임장 오픈채팅 링크가 열린다. */
    @PostMapping("/{meetupId}/apply")
    fun apply(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.apply(UUID.fromString(authentication.name), parseId(meetupId))
    }

    /** 신청 취소. */
    @PostMapping("/{meetupId}/cancel")
    fun cancel(authentication: Authentication, @PathVariable meetupId: String) {
        meetupService.cancel(UUID.fromString(authentication.name), parseId(meetupId))
    }

    private fun parseId(raw: String): UUID = try {
        UUID.fromString(raw)
    } catch (e: IllegalArgumentException) {
        throw DailyMeetException("모임 식별자가 올바르지 않습니다")
    }
}
