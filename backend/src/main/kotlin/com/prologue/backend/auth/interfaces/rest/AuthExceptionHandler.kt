package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.port.SocialVerificationException
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.interfaces.rest.dto.ErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

/**
 * auth 인터페이스 계층 예외 → HTTP 응답 변환.
 * 모든 응답을 ResponseEntity로 직접 반환해 /error 포워드(시큐리티에 막혀 403)를 피한다.
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

    @ExceptionHandler(UnsupportedSocialProviderException::class)
    fun handleUnsupportedProvider(e: UnsupportedSocialProviderException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse("UNSUPPORTED_PROVIDER", e.message))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse("INVALID_REQUEST", e.bindingResult.fieldErrors.firstOrNull()?.defaultMessage ?: "잘못된 요청"))
}
