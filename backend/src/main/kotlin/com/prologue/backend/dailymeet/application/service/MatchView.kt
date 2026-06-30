package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.member.domain.model.Gender
import java.time.Instant
import java.util.UUID

/** 매칭된 상대의 공개 프로필. (블라인드 해제 — 매칭 성사 시에만 노출) */
data class MatchView(
    val peerAccountId: UUID,
    val nickname: String,
    val gender: Gender,
    val birthYear: Int,
    val region: String,
    val matchedAt: Instant,
)
