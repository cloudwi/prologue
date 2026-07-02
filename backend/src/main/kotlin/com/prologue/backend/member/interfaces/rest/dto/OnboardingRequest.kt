package com.prologue.backend.member.interfaces.rest.dto

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull

/** 온보딩 요청 본문. (accountId는 토큰에서 가져오므로 본문에 없음) */
data class OnboardingRequest(
    @field:NotBlank(message = "닉네임은 필수입니다")
    val nickname: String,

    @field:NotNull(message = "성별은 필수입니다")
    val gender: Gender?,

    @field:NotNull(message = "생년은 필수입니다")
    @field:Min(value = 1920, message = "생년이 올바르지 않습니다")
    val birthYear: Int?,

    @field:NotNull(message = "선호 성별은 필수입니다")
    val preferredGender: Gender?,

    @field:NotBlank(message = "지역은 필수입니다")
    val region: String,

    // 선택(프로필 풍부화)
    val bio: String? = null,
    val heightCm: Int? = null,
    val bodyType: BodyType? = null,
    val hobbies: List<String> = emptyList(),
    val interests: List<String> = emptyList(),
    val strengths: List<String> = emptyList(),
)
