package com.prologue.backend.member.interfaces.rest.dto

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member

data class MemberProfileResponse(
    val accountId: String,
    val nickname: String,
    val gender: Gender,
    val birthYear: Int,
    val preferredGender: Gender,
    val region: String,
    val bio: String?,
    val heightCm: Int?,
    val bodyType: BodyType?,
    val hobbies: List<String>,
    val interests: List<String>,
    val strengths: List<String>,
    val avatarId: Int?,
) {
    companion object {
        fun from(member: Member): MemberProfileResponse =
            MemberProfileResponse(
                accountId = member.accountId.toString(),
                nickname = member.nickname,
                gender = member.gender,
                birthYear = member.birthYear,
                preferredGender = member.preferredGender,
                region = member.region,
                bio = member.bio,
                heightCm = member.heightCm,
                bodyType = member.bodyType,
                hobbies = member.hobbies,
                interests = member.interests,
                strengths = member.strengths,
                avatarId = member.avatarId,
            )
    }
}
