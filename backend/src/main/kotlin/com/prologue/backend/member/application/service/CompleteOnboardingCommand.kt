package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import java.util.UUID

/** 온보딩(프로필 작성/수정) 입력. accountId는 인증 주체에서 주입. */
data class CompleteOnboardingCommand(
    val accountId: UUID,
    val nickname: String,
    val gender: Gender,
    val birthYear: Int,
    val preferredGender: Gender,
    val region: String,
    val bio: String? = null,
    val heightCm: Int? = null,
    val bodyType: BodyType? = null,
    val hobbies: List<String> = emptyList(),
    val interests: List<String> = emptyList(),
    val strengths: List<String> = emptyList(),
)
