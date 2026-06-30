package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.DailyMeetService
import com.prologue.backend.dailymeet.interfaces.rest.dto.AnswerRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.PeerResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.TodayResponse
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 오늘의 문답. 인증 필요(JWT).
 */
@RestController
@RequestMapping("/daily")
class DailyMeetController(
    private val dailyMeetService: DailyMeetService,
) {
    /** 오늘의 질문 + 내 답변 여부. */
    @GetMapping("/today")
    fun today(authentication: Authentication): TodayResponse {
        val accountId = UUID.fromString(authentication.name)
        return TodayResponse.from(dailyMeetService.today(accountId))
    }

    /** 블라인드 상대 답변 (내가 먼저 답해야 열람 가능). */
    @GetMapping("/today/peer")
    fun peer(authentication: Authentication): PeerResponse {
        val accountId = UUID.fromString(authentication.name)
        return PeerResponse.from(dailyMeetService.peerAnswer(accountId))
    }

    /** 오늘의 질문에 답변(작성/수정). 답변 후 갱신된 현황 반환. */
    @PostMapping("/today/answer")
    fun answer(
        authentication: Authentication,
        @Valid @RequestBody request: AnswerRequest,
    ): TodayResponse {
        val accountId = UUID.fromString(authentication.name)
        dailyMeetService.answerToday(accountId, request.content)
        return TodayResponse.from(dailyMeetService.today(accountId))
    }
}
