package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import java.time.LocalDate
import java.util.UUID

/** 온보딩(프로필 작성/수정) 입력. accountId는 인증 주체에서 주입. */
data class CompleteOnboardingCommand(
    val accountId: UUID,
    val nickname: String,
    val gender: Gender,
    val birthDate: LocalDate,
    val preferredGender: Gender,
    val region: String,
    val phone: String,
    val bio: String? = null,
    val heightCm: Int? = null,
    val bodyType: BodyType? = null,
    val hobbies: List<String> = emptyList(),
    val interests: List<String> = emptyList(),
    val strengths: List<String> = emptyList(),
    val avatarId: Int? = null,
    val kakaoId: String? = null,
    /**
     * 가입 시 받은 동의. 프로필 수정에서는 오지 않고, 최초 가입에서만 채워진다.
     * 옛 앱 버전은 이 값을 보내지 않으므로 null을 허용한다 — 필수로 바꾸면 이미 배포된 앱의 가입이 막힌다.
     */
    val consent: ConsentAgreement? = null,
)

/** 클라이언트가 보낸 동의 체크 결과. */
data class ConsentAgreement(
    val legalVersion: String,
    val terms: Boolean,
    val privacy: Boolean,
    val age: Boolean,
    val sensitive: Boolean,
    val marketing: Boolean,
)
