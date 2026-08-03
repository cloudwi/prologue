package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.PastPeerView
import java.time.Instant

data class PastPeersResponse(
    val peers: List<Item>,
) {
    data class Item(
        /** 그날의 질문 — 상세 화면에서 답변 블록의 라벨이 된다. */
        val question: String,
        val revealedAt: Instant,
        val peer: PeerResponse,
    )

    companion object {
        fun from(views: List<PastPeerView>): PastPeersResponse =
            PastPeersResponse(
                views.map { Item(question = it.question, revealedAt = it.revealedAt, peer = PeerResponse.from(it.peer)) },
            )
    }
}
