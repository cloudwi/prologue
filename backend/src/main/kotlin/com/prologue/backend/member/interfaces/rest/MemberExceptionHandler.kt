package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.auth.interfaces.rest.dto.ErrorResponse
import com.prologue.backend.member.application.port.PhotoRejectedException
import com.prologue.backend.member.application.port.PhotoUploadException
import com.prologue.backend.member.application.port.StorageNotConfiguredException
import com.prologue.backend.member.application.service.MemberNotOnboardedException
import com.prologue.backend.member.domain.model.MemberDomainException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException

/**
 * member 인터페이스 계층 예외 → HTTP 응답. ResponseEntity로 직접 반환(=/error 포워드로 인한 403 방지).
 */
@RestControllerAdvice(basePackages = ["com.prologue.backend.member"])
class MemberExceptionHandler {

    @ExceptionHandler(MemberDomainException::class)
    fun handleDomain(e: MemberDomainException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse("INVALID_PROFILE", e.message))

    @ExceptionHandler(ProfileNotFoundException::class)
    fun handleProfileNotFound(e: ProfileNotFoundException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse("PROFILE_NOT_FOUND", e.message))

    @ExceptionHandler(MemberNotOnboardedException::class)
    fun handleNotOnboarded(e: MemberNotOnboardedException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse("NOT_ONBOARDED", e.message))

    @ExceptionHandler(StorageNotConfiguredException::class)
    fun handleStorageNotConfigured(e: StorageNotConfiguredException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ErrorResponse("STORAGE_NOT_CONFIGURED", e.message))

    // 검수 탈락(얼굴 없음 등). message는 사용자에게 그대로 보여줄 안내 문구다.
    @ExceptionHandler(PhotoRejectedException::class)
    fun handlePhotoRejected(e: PhotoRejectedException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ErrorResponse("PHOTO_REJECTED", e.message))

    // [진단용] 저장소 업로드 실패 원인을 응답에 노출. 안정화 후 일반 메시지로 축소 예정.
    @ExceptionHandler(PhotoUploadException::class)
    fun handlePhotoUpload(e: PhotoUploadException): ResponseEntity<ErrorResponse> {
        log.error("사진 업로드 실패", e)
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ErrorResponse("PHOTO_UPLOAD_FAILED", e.message))
    }

    // 용량 초과는 스프링이 컨트롤러 진입 전에 던진다. 잡지 않으면 500 "서버 오류"로 뭉개져 원인을 알 수 없다.
    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleTooLarge(e: MaxUploadSizeExceededException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(ErrorResponse("PHOTO_TOO_LARGE", "사진 용량이 너무 커요. 조금 더 작은 사진으로 올려주세요"))

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
