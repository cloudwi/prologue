package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.PeerView
import com.prologue.backend.dailymeet.application.service.TodayPeersView
import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender

data class PeerResponse(
    val peerAnswerId: String?,
    val peerAnswer: String?,
    val answerUnlocked: Boolean,
    val photoUrls: List<String>,
    val nickname: String?,
    val letters: List<ProfileLetterDtos.Letter>,
    val gender: Gender?,
    val age: Int?,
    val region: String?,
    val bio: String?,
    val heightCm: Int?,
    val bodyType: BodyType?,
    val hobbies: List<String>,
    val interests: List<String>,
    val strengths: List<String>,
    val avatarId: Int?,
) {
    companion object {
        fun from(view: PeerView): PeerResponse =
            PeerResponse(
                peerAnswerId = view.peerAnswerId?.toString(),
                peerAnswer = view.peerAnswer,
                answerUnlocked = view.answerUnlocked,
                photoUrls = view.photoUrls,
                nickname = view.nickname,
                letters = view.letters.map { ProfileLetterDtos.Letter(it.questionId, it.question, it.content) },
                gender = view.gender,
                age = view.age,
                region = view.region,
                bio = view.bio,
                heightCm = view.heightCm,
                bodyType = view.bodyType,
                hobbies = view.hobbies,
                interests = view.interests,
                strengths = view.strengths,
                avatarId = view.avatarId,
            )
    }
}

/** 오늘의 상대 목록 — 정오 전에는 open=false, 공개 후 최대 3명. */
data class PeersResponse(
    val open: Boolean,
    val answerUnlocked: Boolean,
    val peers: List<PeerResponse>,
) {
    companion object {
        fun from(view: TodayPeersView): PeersResponse =
            PeersResponse(
                open = view.open,
                answerUnlocked = view.answerUnlocked,
                peers = view.peers.map(PeerResponse::from),
            )
    }
}
