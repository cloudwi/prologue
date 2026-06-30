package com.prologue.backend.dailymeet.application.service

import java.util.UUID

/**
 * 블라인드 상대 답변. 신원 정보 없이 답변 텍스트만.
 * peerAnswerId는 하트를 보낼 때 상대를 지목하는 불투명 식별자(신원 노출 아님).
 */
data class PeerView(
    val hasPeer: Boolean,
    val peerAnswerId: UUID?,
    val peerAnswer: String?,
)
