package com.prologue.backend.member.interfaces.rest.dto

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Past
import java.time.LocalDate

/** 온보딩 요청 본문. (accountId는 토큰에서 가져오므로 본문에 없음) */
data class OnboardingRequest(
    @field:NotBlank(message = "닉네임은 필수입니다")
    val nickname: String,

    @field:NotNull(message = "성별은 필수입니다")
    val gender: Gender?,

    @field:NotNull(message = "생년월일은 필수입니다")
    @field:Past(message = "생년월일이 올바르지 않습니다")
    val birthDate: LocalDate?,

    @field:NotNull(message = "선호 성별은 필수입니다")
    val preferredGender: Gender?,

    @field:NotBlank(message = "지역은 필수입니다")
    val region: String,

    /** 전화번호 — 편지에 실어 보낼 연락처라 가입 시 필수. 형식 검증은 도메인에서 한다. */
    @field:NotBlank(message = "전화번호는 필수입니다")
    val phone: String,

    // 사진은 이 요청이 아니라 POST/DELETE /members/me/photos 로 관리한다.
    // (과거 여기에 images 필드가 있었으나 컨트롤러가 읽지 않으면서 검증만 걸려 모든 요청이 400이 됐다)

    // 선택(프로필 풍부화)
    val bio: String? = null,
    val heightCm: Int? = null,
    val bodyType: BodyType? = null,
    val hobbies: List<String> = emptyList(),
    val interests: List<String> = emptyList(),
    val strengths: List<String> = emptyList(),
    val avatarId: Int? = null,
    val kakaoId: String? = null,
)
