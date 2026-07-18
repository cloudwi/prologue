package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import java.util.UUID

/**
 * 블라인드 상대. 닉네임 등 신원은 감추되 프로필(성별·나이·키·자기소개·키워드)은 공개한다.
 * 답변(글)은 Give&Take — 내가 오늘 답해야 열린다([answerUnlocked]).
 */
data class PeerView(
    val peerAnswerId: UUID?,
    val peerAnswer: String?,
    val answerUnlocked: Boolean,
    val gender: Gender?,
    /** 만 나이(서버 계산). 생년월일 원본은 상대에게 노출하지 않는다. */
    val age: Int?,
    val region: String?,
    val bio: String?,
    val heightCm: Int?,
    val bodyType: BodyType?,
    val hobbies: List<String>,
    val interests: List<String>,
    val strengths: List<String>,
    val avatarId: Int?,
)

/**
 * 오늘의 상대 목록. 매일 정오(KST) 전에는 [open]=false, 공개 후에는 최대 3명의 [peers].
 */
data class TodayPeersView(
    val open: Boolean,
    val answerUnlocked: Boolean,
    val peers: List<PeerView>,
)
