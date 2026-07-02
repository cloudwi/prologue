package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.PeerView
import com.prologue.backend.member.domain.model.Gender

data class PeerResponse(
    val hasPeer: Boolean,
    val peerAnswerId: String?,
    val peerAnswer: String?,
    val gender: Gender?,
    val birthYear: Int?,
) {
    companion object {
        fun from(view: PeerView): PeerResponse =
            PeerResponse(view.hasPeer, view.peerAnswerId?.toString(), view.peerAnswer, view.gender, view.birthYear)
    }
}
