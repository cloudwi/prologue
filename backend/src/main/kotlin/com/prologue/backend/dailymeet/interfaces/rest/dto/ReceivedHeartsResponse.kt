package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.ReceivedHeartView
import java.time.Instant

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
        val createdAt: Instant,
    )

    companion object {
        fun from(views: List<ReceivedHeartView>): ReceivedHeartsResponse =
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
                        createdAt = it.createdAt,
                    )
                },
            )
    }
}
