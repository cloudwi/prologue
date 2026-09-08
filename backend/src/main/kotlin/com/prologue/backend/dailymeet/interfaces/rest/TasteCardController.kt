package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.PeerMatchingService
import com.prologue.backend.dailymeet.application.service.TasteCardService
import com.prologue.backend.dailymeet.interfaces.rest.dto.MyTastesResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.TasteChoiceRequest
import com.prologue.backend.dailymeet.interfaces.rest.dto.TasteDeckResponse
import com.prologue.backend.dailymeet.interfaces.rest.dto.TasteProgressResponse
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** 취향 카드와 정오 기준 하루 묶음. 인증 필요. */
@RestController
@RequestMapping("/taste-cards")
class TasteCardController(
    private val tasteCardService: TasteCardService,
    private val peerMatchingService: PeerMatchingService,
    private val sessions: com.prologue.backend.dailymeet.application.service.TasteSessionService,
) {
    /** 아직 안 고른 카드 한 묶음. */
    @GetMapping
    fun deck(
        authentication: Authentication,
        @RequestParam(required = false) limit: Int?,
        @RequestParam(defaultValue = "1") version: Int,
    ): TasteDeckResponse {
        val accountId = UUID.fromString(authentication.name)
        return TasteDeckResponse.from(
            if (version >= 3) sessions.preview(accountId) else tasteCardService.deck(accountId, limit ?: TasteCardService.DECK_SIZE, if (version >= 2) 2 else 1),
        )
    }

    /** 답변을 저장하고 10개 달성 시 추가 소개를 시도한다. */
    @PostMapping("/{cardId}/choice")
    fun choose(
        authentication: Authentication,
        @PathVariable cardId: Long,
        @Valid @RequestBody request: TasteChoiceRequest,
    ): TasteProgressResponse {
        val accountId = UUID.fromString(authentication.name)
        val progress = request.sessionId?.let { sessions.choose(accountId, it, cardId, request.option, request.note) }
            ?: tasteCardService.choose(accountId, cardId, request.option, request.note)
        val peerArrived = progress.milestoneReached && peerMatchingService.consumeExtraReveals(accountId)
        return TasteProgressResponse.from(progress.copy(reward = request.sessionId?.let { sessions.get(accountId, it).reward }
            ?: tasteCardService.rewardStatus(accountId)), peerArrived)
    }

    @PostMapping("/sessions")
    fun start(authentication: Authentication): TasteDeckResponse =
        TasteDeckResponse.from(sessions.start(UUID.fromString(authentication.name)))

    @GetMapping("/sessions/{sessionId}")
    fun session(authentication: Authentication, @PathVariable sessionId: UUID): TasteDeckResponse =
        TasteDeckResponse.from(sessions.get(UUID.fromString(authentication.name), sessionId))

    @PostMapping("/rewards/claim")
    fun claimReward(authentication: Authentication): TasteProgressResponse {
        val accountId = UUID.fromString(authentication.name)
        val progress = tasteCardService.claimReward(accountId)
        val peerArrived = progress.milestoneReached && peerMatchingService.consumeExtraReveals(accountId)
        return TasteProgressResponse.from(progress.copy(reward = tasteCardService.rewardStatus(accountId)), peerArrived)
    }

    /** 내가 고른 카드 전부 — 본인 전용 기록. */
    @GetMapping("/mine")
    fun mine(authentication: Authentication): MyTastesResponse {
        val accountId = UUID.fromString(authentication.name)
        return MyTastesResponse.from(tasteCardService.mine(accountId))
    }
}
