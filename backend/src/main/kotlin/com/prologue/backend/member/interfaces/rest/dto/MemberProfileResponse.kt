package com.prologue.backend.member.interfaces.rest.dto

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import java.time.LocalDate

data class MemberProfileResponse(
    val accountId: String,
    val nickname: String,
    val gender: Gender,
    val birthDate: LocalDate,
    val preferredGender: Gender?,
    val region: String,
    val bio: String?,
    val heightCm: Int?,
    val bodyType: BodyType?,
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
                region = member.region,
                bio = member.bio,
                heightCm = member.heightCm,
                bodyType = member.bodyType,
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
