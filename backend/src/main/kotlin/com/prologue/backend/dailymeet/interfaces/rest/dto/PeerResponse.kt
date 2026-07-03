package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.PeerView
import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender

data class PeerResponse(
    val hasPeer: Boolean,
    val peerAnswerId: String?,
    val peerAnswer: String?,
    val answerUnlocked: Boolean,
    val gender: Gender?,
    val birthYear: Int?,
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
                hasPeer = view.hasPeer,
                peerAnswerId = view.peerAnswerId?.toString(),
                peerAnswer = view.peerAnswer,
                answerUnlocked = view.answerUnlocked,
                gender = view.gender,
                birthYear = view.birthYear,
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
