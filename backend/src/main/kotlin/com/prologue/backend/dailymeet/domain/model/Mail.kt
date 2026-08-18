package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 편지의 상태 — 봉투로 도착해(PENDING) 열거나(OPENED) 조용히 거절된다(DECLINED).
 * 읽히지 않은 채 사흘이 지나면 보낸 사람이 되찾아갈 수 있다(RECALLED).
 */
enum class MailStatus { PENDING, OPENED, DECLINED, RECALLED }

/**
 * 편지 — 인앱 채팅 대신 연락처를 건네는 한 통.
 * 내용(최대 300자)과 함께 전화번호/카카오톡 ID 중 하나 이상을 반드시 싣는다.
 * 봉투로 도착해 받은 사람이 열어야 내용·연락처가 보인다. 거절하면 조용히 사라지고,
 * 보낸 사람에게는 알리지 않는다 — 그 뒤의 대화는 앱 밖에서 이어진다.
 */
class Mail private constructor(
    val id: UUID?, // 영속 전 null, JPA가 부여(UUIDv7)
    val senderAccountId: UUID,
    val recipientAccountId: UUID,
    val content: String,
    val phone: String?,
    val kakaoId: String?,
    /** 부칠 때 낸 잉크. 회수 환급의 기준 — 정가인지 상호 하트 할인가인지 편지마다 다르다. */
    val inkPaid: Int,
    status: MailStatus,
    val createdAt: Instant,
) {
    var status: MailStatus = status
        private set

    /** 봉투를 연다 — 이미 열린 편지는 그대로(멱등). 거절한 편지는 되돌릴 수 없다. */
    fun open() {
        if (status == MailStatus.DECLINED) throw DailyMeetException("거절한 편지는 열 수 없어요")
        status = MailStatus.OPENED
    }

    /** 조용히 거절한다 — 열어본 편지는 이미 마음을 받은 것이라 거절할 수 없다. */
    fun decline() {
        if (status == MailStatus.OPENED) throw DailyMeetException("이미 열어본 편지예요")
        status = MailStatus.DECLINED
    }

    /**
     * 되찾아간다 — 봉투째 사라지고 보낸 사람은 부친 잉크([inkPaid])의 절반을 돌려받는다.
     *
     * 읽히지 않은 편지만, 그리고 사흘이 지난 뒤에만. 바로 회수할 수 있으면
     * 보내고 물리는 일이 반복돼 받는 쪽 편지함이 흔들리고, 잉크를 쓴 의미도 없어진다.
     * 열어본 편지는 이미 전해진 것이라 되찾을 수 없다 — 마음을 도로 가져올 수는 없다.
     */
    fun recall(now: Instant = Instant.now()) {
        when (status) {
            MailStatus.OPENED -> throw DailyMeetException("이미 읽은 편지는 회수할 수 없어요")
            MailStatus.DECLINED, MailStatus.RECALLED -> throw DailyMeetException("이미 사라진 편지예요")
            MailStatus.PENDING -> Unit
        }
        if (!isRecallableAt(now)) throw DailyMeetException("보낸 지 3일이 지나야 회수할 수 있어요")
        status = MailStatus.RECALLED
    }

    /** 지금 회수할 수 있는 편지인지 — 화면이 버튼을 미리 감출 수 있도록 도메인이 답한다. */
    fun isRecallableAt(now: Instant = Instant.now()): Boolean =
        status == MailStatus.PENDING && !now.isBefore(createdAt.plus(RECALL_AFTER))

    companion object {
        private const val MAX_LENGTH = 300 // 편지 한 통의 분량 — 대화가 아니라 건네는 인사

        /** 회수까지 기다리는 기간 — 상대에게 읽을 시간을 주는 사흘. */
        val RECALL_AFTER: java.time.Duration = java.time.Duration.ofDays(3)

        fun write(
            senderAccountId: UUID,
            recipientAccountId: UUID,
            content: String,
            phone: String?,
            kakaoId: String?,
            inkPaid: Int,
            now: Instant = Instant.now(),
        ): Mail {
            val trimmed = content.trim()
            if (trimmed.isBlank()) throw DailyMeetException("편지 내용을 적어주세요")
            if (trimmed.length > MAX_LENGTH) throw DailyMeetException("편지는 ${MAX_LENGTH}자 이하여야 해요")
            val kakao = kakaoId?.trim()?.ifBlank { null }
            if (phone == null && kakao == null) {
                throw DailyMeetException("전화번호나 카카오톡 ID 중 하나는 함께 보내야 해요")
            }
            return Mail(null, senderAccountId, recipientAccountId, trimmed, phone, kakao, inkPaid, MailStatus.PENDING, now)
        }

        fun reconstitute(
            id: UUID,
            senderAccountId: UUID,
            recipientAccountId: UUID,
            content: String,
            phone: String?,
            kakaoId: String?,
            inkPaid: Int,
            status: MailStatus,
            createdAt: Instant,
        ): Mail = Mail(id, senderAccountId, recipientAccountId, content, phone, kakaoId, inkPaid, status, createdAt)
    }
}
