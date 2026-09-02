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

/**
 * 취향 카드. 인증 필요(JWT).
 *
 * 오늘의 문답과 달리 날짜에 매이지 않는다 — 언제든 열어 남은 카드를 넘긴다.
 */
@RestController
@RequestMapping("/taste-cards")
class TasteCardController(
    private val tasteCardService: TasteCardService,
    private val peerMatchingService: PeerMatchingService,
) {
    /** 아직 안 고른 카드 한 묶음. */
    @GetMapping
    fun deck(
        authentication: Authentication,
        @RequestParam(required = false) limit: Int?,
    ): TasteDeckResponse {
        val accountId = UUID.fromString(authentication.name)
        return TasteDeckResponse.from(
            limit?.let { tasteCardService.deck(accountId, it) } ?: tasteCardService.deck(accountId),
        )
    }

    /**
     * 카드 한 장을 고른다(다시 고르면 덮어쓴다).
     *
     * 이정표를 밟았으면 그 자리에서 소개권을 써본다. 두 서비스를 여기서 잇는 이유는
     * 서로를 참조하지 않게 하기 위해서다 — 소개는 취향을 알지만(매칭 점수), 취향은 소개를
     * 몰라야 한다. 후보가 없어 지금 못 만나면 표는 남아 다음에 쓰인다.
     */
    @PostMapping("/{cardId}/choice")
    fun choose(
        authentication: Authentication,
        @PathVariable cardId: Long,
        @Valid @RequestBody request: TasteChoiceRequest,
    ): TasteProgressResponse {
        val accountId = UUID.fromString(authentication.name)
        val progress = tasteCardService.choose(accountId, cardId, request.option, request.note)
        val peerArrived = progress.milestoneReached && peerMatchingService.consumeExtraReveals(accountId)
        return TasteProgressResponse.from(progress, peerArrived)
    }

    /** 내가 고른 카드 전부 — 본인 전용 기록. */
    @GetMapping("/mine")
    fun mine(authentication: Authentication): MyTastesResponse {
        val accountId = UUID.fromString(authentication.name)
        return MyTastesResponse.from(tasteCardService.mine(accountId))
    }
}
