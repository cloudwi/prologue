package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.member.application.service.LifestyleService
import com.prologue.backend.member.domain.model.ContactFrequency
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** 구버전 생활 습관 PUT이 새 값을 지우지 않도록 연락 빈도만 독립적으로 저장한다. */
@RestController
@RequestMapping("/members/me/contact-frequency")
class ContactFrequencyController(
    private val lifestyleService: LifestyleService,
) {
    @GetMapping
    fun view(authentication: Authentication): ContactFrequencyResponse =
        ContactFrequencyResponse(lifestyleService.contactFrequency(UUID.fromString(authentication.name)))

    @PutMapping
    fun update(
        authentication: Authentication,
        @RequestBody request: ContactFrequencyRequest,
    ): ContactFrequencyResponse = ContactFrequencyResponse(
        lifestyleService.updateContactFrequency(UUID.fromString(authentication.name), request.contactFrequency),
    )
}

data class ContactFrequencyRequest(val contactFrequency: ContactFrequency? = null)
data class ContactFrequencyResponse(val contactFrequency: ContactFrequency?)
