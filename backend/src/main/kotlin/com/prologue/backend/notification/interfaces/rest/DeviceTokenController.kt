package com.prologue.backend.notification.interfaces.rest

import com.prologue.backend.dailymeet.domain.model.StorePlatform
import com.prologue.backend.notification.application.service.NotificationService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 푸시 기기 등록/해제. 인증 필요.
 * 알림 끄기는 별도 설정이 아니라 해제(DELETE)로 표현한다 — 보낼 곳이 없으면 안 간다.
 */
@RestController
@RequestMapping("/notifications/devices")
class DeviceTokenController(
    private val notificationService: NotificationService,
) {
    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun register(authentication: Authentication, @Valid @RequestBody request: RegisterDeviceRequest) {
        notificationService.registerDevice(
            accountId = UUID.fromString(authentication.name),
            token = request.token,
            platform = request.platform!!,
        )
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun unregister(@Valid @RequestBody request: UnregisterDeviceRequest) {
        notificationService.unregisterDevice(request.token)
    }
}

data class RegisterDeviceRequest(
    @field:NotBlank(message = "기기 토큰은 필수입니다")
    val token: String,
    @field:NotNull(message = "플랫폼은 필수입니다")
    val platform: StorePlatform?,
)

data class UnregisterDeviceRequest(
    @field:NotBlank(message = "기기 토큰은 필수입니다")
    val token: String,
)
