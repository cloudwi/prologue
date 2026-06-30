package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.MatchQueryService
import com.prologue.backend.dailymeet.interfaces.rest.dto.MatchResponse
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 매칭 목록. 인증 필요(JWT). 매칭된 상대의 프로필을 공개한다.
 */
@RestController
@RequestMapping("/matches")
class MatchController(
    private val matchQueryService: MatchQueryService,
) {
    @GetMapping
    fun myMatches(authentication: Authentication): List<MatchResponse> {
        val accountId = UUID.fromString(authentication.name)
        return matchQueryService.myMatches(accountId).map(MatchResponse::from)
    }
}
