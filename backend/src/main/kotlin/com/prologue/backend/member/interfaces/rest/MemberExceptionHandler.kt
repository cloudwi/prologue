package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.auth.interfaces.rest.dto.ErrorResponse
import com.prologue.backend.member.domain.model.MemberDomainException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

/**
 * member 인터페이스 계층 예외 → HTTP 응답. ResponseEntity로 직접 반환(=/error 포워드로 인한 403 방지).
 */
@RestControllerAdvice(basePackages = ["com.prologue.backend.member"])
class MemberExceptionHandler {

    @ExceptionHandler(MemberDomainException::class)
    fun handleDomain(e: MemberDomainException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse("INVALID_PROFILE", e.message))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse("INVALID_REQUEST", e.bindingResult.fieldErrors.firstOrNull()?.defaultMessage ?: "잘못된 요청"))

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadable(e: HttpMessageNotReadableException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse("INVALID_REQUEST", "요청 본문이 올바르지 않습니다"))

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(e: Exception): ResponseEntity<ErrorResponse> {
        log.error("처리되지 않은 예외 발생", e)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다"))
    }

    companion object {
        private val log = LoggerFactory.getLogger(MemberExceptionHandler::class.java)
    }
}
