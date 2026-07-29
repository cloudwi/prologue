package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.ProfileLetterService
import com.prologue.backend.dailymeet.interfaces.rest.dto.ProfileLetterDtos
import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** 프로필 편지 — 질문을 골라 미리 써두는 자기소개. 인증 필요. */
@RestController
@RequestMapping("/profile-letters")
class ProfileLetterController(
    private val profileLetterService: ProfileLetterService,
) {
    /** 고를 수 있는 질문 풀. */
    @GetMapping("/questions")
    fun questions(): ProfileLetterDtos.Questions =
        ProfileLetterDtos.Questions(profileLetterService.questions().map { ProfileLetterDtos.Question(it.id, it.content) })

    @GetMapping
    fun mine(authentication: Authentication): ProfileLetterDtos.Letters =
        ProfileLetterDtos.Letters.from(profileLetterService.myLetters(UUID.fromString(authentication.name)))

    /** 쓰기/고치기 겸용(upsert). 오늘의 답변을 프로필에 올릴 때도 이 API를 쓴다. */
    @PutMapping("/{questionId}")
    fun write(
        authentication: Authentication,
        @PathVariable questionId: Long,
        @Valid @RequestBody request: ProfileLetterDtos.WriteRequest,
    ): ProfileLetterDtos.Letters =
        ProfileLetterDtos.Letters.from(
            profileLetterService.write(UUID.fromString(authentication.name), questionId, request.content),
        )

    @DeleteMapping("/{questionId}")
    fun remove(authentication: Authentication, @PathVariable questionId: Long): ProfileLetterDtos.Letters =
        ProfileLetterDtos.Letters.from(profileLetterService.remove(UUID.fromString(authentication.name), questionId))
}
