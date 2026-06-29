package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.port.SocialVerificationException
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.interfaces.rest.dto.ErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

/**
 * auth 인터페이스 계층 예외 → HTTP 응답 변환.
 */
@RestControllerAdvice(basePackages = ["com.prologue.backend.auth"])
class AuthExceptionHandler {

    @ExceptionHandler(SocialVerificationException::class)
    fun handleSocialVerification(e: SocialVerificationException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ErrorResponse("INVALID_SOCIAL_TOKEN", e.message))

    @ExceptionHandler(AuthDomainException::class)
    fun handleAuthDomain(e: AuthDomainException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ErrorResponse("ACCOUNT_NOT_LOGINABLE", e.message))
}
