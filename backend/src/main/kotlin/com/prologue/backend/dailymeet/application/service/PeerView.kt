package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.member.domain.model.Gender
import java.util.UUID

/**
 * 블라인드 상대 답변. 닉네임 등 신원은 감추되 성별·생년은 공개한다.
 * peerAnswerId는 하트/대화 신청 시 상대를 지목하는 불투명 식별자(신원 노출 아님).
 */
data class PeerView(
    val hasPeer: Boolean,
    val peerAnswerId: UUID?,
    val peerAnswer: String?,
    val gender: Gender?,
    val birthYear: Int?,
)
