package com.prologue.backend.dailymeet.application.service

/** 블라인드 상대 답변. 신원 정보 없이 답변 텍스트만. */
data class PeerView(
    val hasPeer: Boolean,
    val peerAnswer: String?,
)
