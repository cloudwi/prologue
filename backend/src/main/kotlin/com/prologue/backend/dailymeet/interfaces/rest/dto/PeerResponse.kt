package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.PeerView

data class PeerResponse(
    val hasPeer: Boolean,
    val peerAnswer: String?,
) {
    companion object {
        fun from(view: PeerView): PeerResponse = PeerResponse(view.hasPeer, view.peerAnswer)
    }
}
