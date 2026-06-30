package com.prologue.backend.member.interfaces.rest.dto

import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member

data class MemberProfileResponse(
    val accountId: String,
    val nickname: String,
    val gender: Gender,
    val birthYear: Int,
    val preferredGender: Gender,
    val region: String,
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
            )
    }
}
