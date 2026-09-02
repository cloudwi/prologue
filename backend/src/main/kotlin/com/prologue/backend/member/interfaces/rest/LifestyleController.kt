package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.member.application.service.LifestyleService
import com.prologue.backend.member.domain.model.Drinking
import com.prologue.backend.member.domain.model.MeetFrequency
import com.prologue.backend.member.domain.model.Smoking
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 생활 습관(흡연·음주·만나는 빈도). 인증 필요(JWT).
 *
 * 프로필의 일부지만 경로를 따로 둔다 — 프로필 저장은 전체 덮어쓰기라, 이 항목을 모르는 화면이
 * 저장 한 번으로 지워버리기 때문이다(종교·정치와 같은 이유, 다만 이쪽은 동의가 필요 없다).
 */
@RestController
@RequestMapping("/members/me/lifestyle")
class LifestyleController(
    private val lifestyleService: LifestyleService,
) {
    @GetMapping
    fun view(authentication: Authentication): LifestyleResponse =
        LifestyleResponse.from(lifestyleService.view(UUID.fromString(authentication.name)))

    /** 셋을 한 번에 저장한다(부분 수정이 아니다). null은 "안 고름"으로 저장된다. */
    @PutMapping
    fun update(
        authentication: Authentication,
        @RequestBody request: LifestyleRequest,
    ): LifestyleResponse {
        val accountId = UUID.fromString(authentication.name)
        return LifestyleResponse.from(
            lifestyleService.update(accountId, request.smoking, request.drinking, request.meetFrequency),
        )
    }
}

data class LifestyleRequest(
    val smoking: Smoking? = null,
    val drinking: Drinking? = null,
    val meetFrequency: MeetFrequency? = null,
)

data class LifestyleResponse(
    val smoking: Smoking?,
    val drinking: Drinking?,
    val meetFrequency: MeetFrequency?,
) {
    companion object {
        fun from(view: LifestyleService.LifestyleView): LifestyleResponse =
            LifestyleResponse(view.smoking, view.drinking, view.meetFrequency)
    }
}
