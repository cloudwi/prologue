package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.MatchView
import com.prologue.backend.member.domain.model.Gender

data class MatchResponse(
    val peerAccountId: String,
    val nickname: String,
    val gender: Gender,
    val birthYear: Int,
    val region: String,
    val matchedAt: String,
) {
    companion object {
        fun from(view: MatchView): MatchResponse =
            MatchResponse(
                peerAccountId = view.peerAccountId.toString(),
                nickname = view.nickname,
                gender = view.gender,
                birthYear = view.birthYear,
                region = view.region,
                matchedAt = view.matchedAt.toString(),
            )
    }
}
