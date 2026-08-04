package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.ReceivedMailView
import com.prologue.backend.dailymeet.application.service.SendMailResult
import jakarta.validation.constraints.NotBlank
import java.time.Instant

/** 편지 보내기 요청. 전화번호는 본문이 아니라 프로필에서 읽는다(위조 방지) — 포함 여부만 받는다. */
data class SendMailRequest(
    @field:NotBlank(message = "상대 답변 식별자가 필요합니다")
    val peerAnswerId: String,

    @field:NotBlank(message = "편지 내용을 적어주세요")
    val content: String,

    val includePhone: Boolean = false,
    val kakaoId: String? = null,
)

/** 답장 요청 — 상대는 경로의 원본 편지에서 정해지므로 본문에는 내용·연락처만. */
data class ReplyMailRequest(
    @field:NotBlank(message = "편지 내용을 적어주세요")
    val content: String,

    val includePhone: Boolean = false,
    val kakaoId: String? = null,
)

data class SendMailResponse(
    val mailId: String,
) {
    companion object {
        fun from(result: SendMailResult): SendMailResponse =
            SendMailResponse(result.mailId.toString())
    }
}

/** 내가 보낸 편지 — 부친 뒤에는 고칠 수 없는 기록. 없으면 mail=null. */
data class SentMailToResponse(
    val mail: Item?,
) {
    data class Item(
        val mailId: String,
        val recipientNickname: String?,
        val content: String,
        val phone: String?,
        val kakaoId: String?,
        val createdAt: Instant,
    )

    companion object {
        fun from(view: com.prologue.backend.dailymeet.application.service.SentMailView?): SentMailToResponse =
            SentMailToResponse(
                view?.let {
                    Item(
                        mailId = it.mailId.toString(),
                        recipientNickname = it.recipientNickname,
                        content = it.content,
                        phone = it.phone,
                        kakaoId = it.kakaoId,
                        createdAt = it.createdAt,
                    )
                },
            )
    }
}

data class ReceivedMailsResponse(
    val mails: List<Item>,
) {
    data class Item(
        val mailId: String,
        val nickname: String,
        val age: Int,
        val region: String,
        val avatarId: Int?,
        val photoUrl: String?,
        val content: String,
        val phone: String?,
        val kakaoId: String?,
        /** 보낸 사람 프로필 상세로 들어갈 답변 id. null이면 진입 버튼을 숨긴다. */
        val peerAnswerId: String?,
        /** 내가 이미 답장(편지)을 보냈는지 — true면 답장 버튼 대신 보낸 편지 확인. */
        val replied: Boolean,
        val createdAt: Instant,
    )

    companion object {
        fun from(views: List<ReceivedMailView>): ReceivedMailsResponse =
            ReceivedMailsResponse(
                views.map {
                    Item(
                        mailId = it.mailId.toString(),
                        nickname = it.nickname,
                        age = it.age,
                        region = it.region,
                        avatarId = it.avatarId,
                        photoUrl = it.photoUrl,
                        content = it.content,
                        phone = it.phone,
                        kakaoId = it.kakaoId,
                        peerAnswerId = it.peerAnswerId?.toString(),
                        replied = it.replied,
                        createdAt = it.createdAt,
                    )
                },
            )
    }
}
