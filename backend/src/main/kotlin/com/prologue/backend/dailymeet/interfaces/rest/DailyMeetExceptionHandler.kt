package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.auth.interfaces.rest.dto.ErrorResponse
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.member.application.port.PhotoRejectedException
import com.prologue.backend.member.application.port.PhotoUploadException
import com.prologue.backend.member.application.port.StorageNotConfiguredException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException

@RestControllerAdvice(basePackages = ["com.prologue.backend.dailymeet"])
class DailyMeetExceptionHandler {

    @ExceptionHandler(PhotoRejectedException::class)
    fun handlePhotoRejected(e: PhotoRejectedException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ErrorResponse("PHOTO_REJECTED", e.message))

    @ExceptionHandler(StorageNotConfiguredException::class)
    fun handleStorageUnavailable(e: StorageNotConfiguredException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(ErrorResponse("STORAGE_NOT_CONFIGURED", "지금은 사진을 저장할 수 없어요. 잠시 후 다시 시도해주세요."))

    @ExceptionHandler(PhotoUploadException::class)
    fun handlePhotoUpload(e: PhotoUploadException): ResponseEntity<ErrorResponse> {
        log.error("모임 사진 업로드 실패", e)
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(ErrorResponse("PHOTO_UPLOAD_FAILED", "사진을 저장하지 못했어요. 잠시 후 다시 시도해주세요."))
    }

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handlePhotoTooLarge(e: MaxUploadSizeExceededException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(ErrorResponse("PHOTO_TOO_LARGE", "사진 용량이 너무 커요. 조금 더 작은 사진으로 올려주세요."))

    @ExceptionHandler(DailyMeetException::class)
    fun handleDomain(e: DailyMeetException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse("INVALID_ANSWER", e.message))

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
        private val log = LoggerFactory.getLogger(DailyMeetExceptionHandler::class.java)
    }
}
