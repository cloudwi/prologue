package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.DailyMeetService
import com.prologue.backend.dailymeet.application.service.HeartService
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.interfaces.rest.dto.AnswerRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.HeartRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.HeartResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.PastPeersResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.PeersResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.ReceivedHeartsResponse
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
    private val heartService: HeartService,
) {
    /** 오늘의 질문 + 내 답변 여부. */
    @GetMapping("/today")
    fun today(authentication: Authentication): TodayResponse {
        val accountId = UUID.fromString(authentication.name)
        return TodayResponse.from(dailyMeetService.today(accountId))
    }

    /** 오늘의 상대 목록 (매일 정오 공개, 최대 2명, 답변은 내가 먼저 답해야 열람 가능). */
    @GetMapping("/today/peers")
    fun peers(authentication: Authentication): PeersResponse {
        val accountId = UUID.fromString(authentication.name)
        return PeersResponse.from(dailyMeetService.todayPeers(accountId))
    }

    /** 지난 상대 — 최근 3일 동안 공개됐던 상대(오늘 제외), 최신 공개 순. */
    @GetMapping("/past-peers")
    fun pastPeers(authentication: Authentication): PastPeersResponse {
        val accountId = UUID.fromString(authentication.name)
        return PastPeersResponse.from(dailyMeetService.pastPeers(accountId))
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

    /** 익명 상대 답변에 하트. 상호 하트면 매칭 성립. */
    @PostMapping("/today/heart")
    fun heart(
        authentication: Authentication,
        @Valid @RequestBody request: HeartRequest,
    ): HeartResponse {
        val accountId = UUID.fromString(authentication.name)
        val peerAnswerId = try {
            UUID.fromString(request.peerAnswerId)
        } catch (e: IllegalArgumentException) {
            throw DailyMeetException("상대 답변 식별자가 올바르지 않습니다")
        }
        return HeartResponse.from(heartService.heart(accountId, peerAnswerId))
    }

    /** 나에게 하트를 보낸 사람들(아직 상호 아님). 하트를 돌려보내면 그 자리에서 매칭. */
    @GetMapping("/hearts/received")
    fun receivedHearts(authentication: Authentication): ReceivedHeartsResponse {
        val accountId = UUID.fromString(authentication.name)
        return ReceivedHeartsResponse.from(heartService.receivedHearts(accountId))
    }
}
