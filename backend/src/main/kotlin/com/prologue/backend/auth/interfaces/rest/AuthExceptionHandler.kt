package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.port.SocialVerificationException
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.interfaces.rest.dto.ErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
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

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadable(e: HttpMessageNotReadableException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse("INVALID_REQUEST", "요청 본문이 올바르지 않습니다"))

    // 처리되지 않은 예외를 500 JSON으로 직접 응답(=/error 포워드로 인한 깜깜이 403 방지).
    // 메시지를 노출하므로 진단 후에는 메시지를 가리거나 로깅만으로 전환할 것.
    @ExceptionHandler(Exception::class)
    fun handleUnexpected(e: Exception): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse("INTERNAL_ERROR", "${e.javaClass.simpleName}: ${e.message}"))
}
