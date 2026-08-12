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
        /** 프로필이 닫히는 시각. 이미 닫혔거나 잉크로 열어둔 상대는 null. */
        val closesAt: Instant?,
        val peer: PeerResponse,
        /** 이 상대가 남긴 문답 목록(최신 공개 순). 잠긴 답변은 content가 null. */
        val answers: List<AnswerItem>,
    )

    data class AnswerItem(
        val question: String,
        val content: String?,
        val unlocked: Boolean,
        val revealedAt: Instant,
    )

    companion object {
        fun from(views: List<PastPeerView>): PastPeersResponse =
            PastPeersResponse(
                views.map { view ->
                    Item(
                        question = view.question,
                        revealedAt = view.revealedAt,
                        closesAt = view.closesAt,
                        peer = PeerResponse.from(view.peer),
                        answers = view.answers.map {
                            AnswerItem(question = it.question, content = it.content, unlocked = it.unlocked, revealedAt = it.revealedAt)
                        },
                    )
                },
            )
    }
}
