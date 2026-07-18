package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.member.application.service.CompleteOnboardingCommand
import com.prologue.backend.member.application.service.MemberPhotoService
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.application.service.OnboardingService
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.interfaces.rest.dto.MemberProfileResponse
import com.prologue.backend.member.interfaces.rest.dto.OnboardingRequest
import jakarta.validation.Valid
import org.springframework.http.MediaType
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

/**
 * 온보딩/프로필. 인증 필요(JWT) — accountId는 토큰에서 얻는다.
 */
@RestController
@RequestMapping("/members")
class OnboardingController(
    private val onboardingService: OnboardingService,
    private val memberQueryService: MemberQueryService,
    private val memberPhotoService: MemberPhotoService,
) {
    private companion object {
        val ALLOWED_IMAGE_TYPES = setOf("image/jpeg", "image/png", "image/webp")
    }
    /** 내 프로필 조회. 온보딩 완료 여부 판단용 — 없으면 404. */
    @GetMapping("/me")
    fun getMyProfile(authentication: Authentication): MemberProfileResponse {
        val accountId = UUID.fromString(authentication.name)
        val member = memberQueryService.findProfile(accountId) ?: throw ProfileNotFoundException()
        return MemberProfileResponse.from(member)
    }

    /** 프로필 생성/수정 (upsert). */
    @PutMapping("/me")
    fun completeOnboarding(
        authentication: Authentication,
        @Valid @RequestBody request: OnboardingRequest,
    ): MemberProfileResponse {
        val accountId = UUID.fromString(authentication.name)
        val member = onboardingService.complete(
            CompleteOnboardingCommand(
                accountId = accountId,
                nickname = request.nickname,
                gender = request.gender!!,
                birthDate = request.birthDate!!,
                preferredGender = request.preferredGender!!,
                region = request.region,
                bio = request.bio,
                heightCm = request.heightCm,
                bodyType = request.bodyType,
                hobbies = request.hobbies,
                interests = request.interests,
                strengths = request.strengths,
                avatarId = request.avatarId,
            ),
        )
        return MemberProfileResponse.from(member)
    }

    /** 프로필 사진 추가(멀티파트, 최대 6장). 온보딩 완료 후 사용. */
    @PostMapping("/me/photos", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun addPhoto(
        authentication: Authentication,
        @RequestParam("file") file: MultipartFile,
    ): MemberProfileResponse {
        if (file.isEmpty) throw MemberDomainException("이미지 파일이 비어 있습니다")
        val contentType = file.contentType
        if (contentType == null || contentType.lowercase() !in ALLOWED_IMAGE_TYPES) {
            throw MemberDomainException("jpg/png/webp 이미지만 업로드할 수 있습니다")
        }
        val accountId = UUID.fromString(authentication.name)
        val member = memberPhotoService.addPhoto(accountId, file.bytes, contentType.lowercase())
        return MemberProfileResponse.from(member)
    }

    /** 프로필 사진 삭제(공개 URL 지정). */
    @DeleteMapping("/me/photos")
    fun removePhoto(
        authentication: Authentication,
        @RequestParam("url") url: String,
    ): MemberProfileResponse {
        val accountId = UUID.fromString(authentication.name)
        val member = memberPhotoService.removePhoto(accountId, url)
        return MemberProfileResponse.from(member)
    }
}
