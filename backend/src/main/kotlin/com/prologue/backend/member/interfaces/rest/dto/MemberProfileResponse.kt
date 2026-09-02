package com.prologue.backend.member.interfaces.rest.dto

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Drinking
import com.prologue.backend.member.domain.model.MeetFrequency
import com.prologue.backend.member.domain.model.Smoking
import com.prologue.backend.member.domain.model.PoliticalLeaning
import com.prologue.backend.member.domain.model.Religion
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import java.time.LocalDate

data class MemberProfileResponse(
    val accountId: String,
    val nickname: String,
    val gender: Gender,
    val birthDate: LocalDate,
    val preferredGender: Gender?,
    val minAge: Int?,
    val maxAge: Int?,
    val region: String,
    val bio: String?,
    val heightCm: Int?,
    val bodyType: BodyType?,
    /** 종교·정치 성향(민감정보). 안 적었으면 null — 수정은 전용 경로(PUT /members/me/beliefs). */
    val religion: Religion?,
    val politicalLeaning: PoliticalLeaning?,
    /** 생활 습관(흡연·음주·만나는 빈도). 안 골랐으면 null — 수정은 PUT /members/me/lifestyle. */
    val smoking: Smoking?,
    val drinking: Drinking?,
    val meetFrequency: MeetFrequency?,
    val hobbies: List<String>,
    val interests: List<String>,
    val strengths: List<String>,
    val avatarId: Int?,
    /** 프로필 사진 URL 목록(등록 순). */
    val photoUrls: List<String>,
    /** 내 연락처(본인 조회 전용 응답이라 노출해도 안전). 이전 회원은 전화번호가 비어 있을 수 있다. */
    val phone: String?,
    val kakaoId: String?,
    /** 로그인에 쓰는 이메일. 계정의 자연키라 화면에서는 읽기 전용으로 보여준다. */
    val email: String?,
) {
    companion object {
        fun from(member: Member, email: String? = null): MemberProfileResponse =
            MemberProfileResponse(
                accountId = member.accountId.toString(),
                nickname = member.nickname,
                gender = member.gender,
                birthDate = member.birthDate,
                preferredGender = member.preferredGender,
                minAge = member.minAge,
                maxAge = member.maxAge,
                region = member.region,
                bio = member.bio,
                heightCm = member.heightCm,
                bodyType = member.bodyType,
                religion = member.religion,
                politicalLeaning = member.politicalLeaning,
                smoking = member.smoking,
                drinking = member.drinking,
                meetFrequency = member.meetFrequency,
                hobbies = member.hobbies,
                interests = member.interests,
                strengths = member.strengths,
                avatarId = member.avatarId,
                photoUrls = member.photoUrls,
                phone = member.phone,
                kakaoId = member.kakaoId,
                email = email,
            )
    }
}
