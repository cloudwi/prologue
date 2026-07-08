package com.prologue.backend.auth.interfaces.rest

import com.prologue.backend.auth.application.service.InvalidVerificationCodeException
import com.prologue.backend.auth.application.service.TooManyRequestsException
import com.prologue.backend.auth.domain.model.AuthDomainException
import com.prologue.backend.auth.interfaces.rest.dto.ErrorResponse
import org.slf4j.LoggerFactory
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

    @ExceptionHandler(InvalidVerificationCodeException::class)
    fun handleInvalidCode(e: InvalidVerificationCodeException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ErrorResponse("INVALID_CODE", e.message))

    @ExceptionHandler(TooManyRequestsException::class)
    fun handleTooManyRequests(e: TooManyRequestsException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(ErrorResponse("TOO_MANY_REQUESTS", e.message))

    @ExceptionHandler(AuthDomainException::class)
    fun handleAuthDomain(e: AuthDomainException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ErrorResponse("ACCOUNT_NOT_LOGINABLE", e.message))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse("INVALID_REQUEST", e.bindingResult.fieldErrors.firstOrNull()?.defaultMessage ?: "잘못된 요청"))

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadable(e: HttpMessageNotReadableException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse("INVALID_REQUEST", "요청 본문이 올바르지 않습니다"))

    // 처리되지 않은 예외: 서버에는 상세 로그를 남기고, 클라이언트엔 일반 메시지만 반환.
    @ExceptionHandler(Exception::class)
    fun handleUnexpected(e: Exception): ResponseEntity<ErrorResponse> {
        log.error("처리되지 않은 예외 발생", e)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다"))
    }

    companion object {
        private val log = LoggerFactory.getLogger(AuthExceptionHandler::class.java)
    }
}
