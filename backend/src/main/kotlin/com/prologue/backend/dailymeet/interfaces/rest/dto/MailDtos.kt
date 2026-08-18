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
    /** 실제로 쓴 잉크 — 상호 하트 할인이 적용됐으면 정가보다 적다. */
    val inkSpent: Int,
) {
    companion object {
        fun from(result: SendMailResult): SendMailResponse =
            SendMailResponse(result.mailId.toString(), result.inkSpent)
    }
}

/** 편지값 견적 — 부치기 전에 화면이 보여줄 값. mutual=true면 서로 하트 할인가다. */
data class MailQuoteResponse(
    val price: Int,
    val mutual: Boolean,
) {
    companion object {
        fun from(quote: com.prologue.backend.dailymeet.application.service.MailQuote): MailQuoteResponse =
            MailQuoteResponse(quote.price, quote.mutual)
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
        /** PENDING이면 상대가 아직 봉투를 열지 않았다. */
        val status: String,
        /** 지금 회수할 수 있는지 — 안 읽힌 채 사흘이 지났을 때만 true. */
        val recallable: Boolean,
        /** 회수하면 돌아올 잉크 — 부친 값의 절반. */
        val recallRefund: Int,
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
                        status = it.status.name,
                        recallable = it.recallable,
                        recallRefund = it.recallRefund,
                        createdAt = it.createdAt,
                    )
                },
            )
    }
}

/** 받은 편지 한 통 — 봉투(PENDING)면 내용·연락처가 null, 열어야(OPENED) 채워진다. */
data class ReceivedMailItem(
    val mailId: String,
    val nickname: String,
    val age: Int,
    val region: String,
    val avatarId: Int?,
    val photoUrl: String?,
    val status: String,
    val content: String?,
    val phone: String?,
    val kakaoId: String?,
    /** 보낸 사람 프로필 상세로 들어갈 답변 id. null이면 진입 버튼을 숨긴다. */
    val peerAnswerId: String?,
    /** 내가 이미 답장(편지)을 보냈는지 — true면 답장 버튼 대신 보낸 편지 확인. */
    val replied: Boolean,
    val createdAt: Instant,
) {
    companion object {
        fun from(it: ReceivedMailView): ReceivedMailItem =
            ReceivedMailItem(
                mailId = it.mailId.toString(),
                nickname = it.nickname,
                age = it.age,
                region = it.region,
                avatarId = it.avatarId,
                photoUrl = it.photoUrl,
                status = it.status.name,
                content = it.content,
                phone = it.phone,
                kakaoId = it.kakaoId,
                peerAnswerId = it.peerAnswerId?.toString(),
                replied = it.replied,
                createdAt = it.createdAt,
            )
    }
}

data class ReceivedMailsResponse(
    val mails: List<ReceivedMailItem>,
) {
    companion object {
        fun from(views: List<ReceivedMailView>): ReceivedMailsResponse =
            ReceivedMailsResponse(views.map(ReceivedMailItem::from))
    }
}
