package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.HeartPeerView
import java.time.Instant

/** 하트로 이어진 상대 목록 — 받은 하트(/hearts/received)와 보낸 하트(/hearts/sent)가 같은 모양으로 쓴다. */
data class ReceivedHeartsResponse(
    val hearts: List<Item>,
) {
    data class Item(
        val nickname: String,
        val age: Int,
        val region: String,
        val avatarId: Int?,
        val photoUrl: String?,
        /** 행동 대상 상대 답변 id. null이면 버튼을 숨긴다(옛 데이터). */
        val peerAnswerId: String?,
        /** 서로 하트 — true면 하트 되보내기 대신 편지 쓰기 차례다. */
        val mutual: Boolean,
        /** 내가 이미 편지를 보냈는지 — true면 편지 쓰기 대신 보낸 편지 확인. */
        val mailSent: Boolean,
        /** 이어진 지 사흘이 지나 프로필이 닫혔는지. true면 photoUrl이 비어 오고, 열려면 잉크가 든다. */
        val locked: Boolean,
        val createdAt: Instant,
    )

    companion object {
        fun from(views: List<HeartPeerView>): ReceivedHeartsResponse =
            ReceivedHeartsResponse(
                views.map {
                    Item(
                        nickname = it.nickname,
                        age = it.age,
                        region = it.region,
                        avatarId = it.avatarId,
                        photoUrl = it.photoUrl,
                        peerAnswerId = it.peerAnswerId?.toString(),
                        mutual = it.mutual,
                        mailSent = it.mailSent,
                        locked = it.locked,
                        createdAt = it.createdAt,
                    )
                },
            )
    }
}
