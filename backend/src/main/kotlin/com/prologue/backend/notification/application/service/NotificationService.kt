package com.prologue.backend.notification.application.service

import com.prologue.backend.dailymeet.domain.model.StorePlatform
import com.prologue.backend.notification.application.port.PushMessage
import com.prologue.backend.notification.application.port.PushSender
import com.prologue.backend.notification.domain.model.DeviceToken
import com.prologue.backend.notification.domain.repository.DeviceTokenRepository
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 알림 — 무엇을 언제 알릴지.
 *
 * 발송은 모두 [Async]다. 편지를 저장하는 트랜잭션 안에서 외부 HTTP를 기다리면
 * DB 연결을 붙든 채 남의 서버 응답을 기다리는 꼴이 된다. 알림이 늦거나 실패해도
 * 편지는 이미 저장돼 있어야 한다.
 *
 * 알림 끄기는 기기 토큰 삭제로 표현한다 — 보낼 곳이 없으면 안 간다.
 */
@Service
class NotificationService(
    private val deviceTokenRepository: DeviceTokenRepository,
    private val pushSender: PushSender,
) {
    /** 기기 등록. 같은 토큰이 다른 계정에 물려 있으면 소유자를 옮긴다. */
    @Transactional
    fun registerDevice(accountId: UUID, token: String, platform: StorePlatform) {
        val existing = deviceTokenRepository.findByToken(token)
        if (existing != null) {
            existing.reassignTo(accountId)
            deviceTokenRepository.save(existing)
            return
        }
        deviceTokenRepository.save(DeviceToken.register(accountId, token, platform))
    }

    /** 이 기기에서 알림 끄기. */
    @Transactional
    fun unregisterDevice(token: String) = deviceTokenRepository.deleteByToken(token)

    /** 탈퇴 시 정리 — 계정이 사라졌는데 알림이 계속 가면 안 된다. */
    @Transactional
    fun forget(accountId: UUID) = deviceTokenRepository.deleteAllByAccountId(accountId)

    @Async
    @Transactional(readOnly = true)
    fun letterArrived(recipientAccountId: UUID) = notify(
        recipientAccountId,
        PushMessage(
            title = "편지가 도착했어요",
            body = "봉투를 열어볼지는 천천히 정하셔도 괜찮아요.",
            data = mapOf("screen" to "mails"),
        ),
    )

    @Async
    @Transactional(readOnly = true)
    fun heartArrived(recipientAccountId: UUID) = notify(
        recipientAccountId,
        PushMessage(
            title = "누군가 호감을 보냈어요",
            body = "편지함에서 확인해 보세요.",
            data = mapOf("screen" to "mails"),
        ),
    )

    /** 모임장이 자리를 확정했다 — 입금 확인이 끝났다는 뜻이라 신청자가 가장 기다리는 소식. */
    @Async
    @Transactional(readOnly = true)
    fun meetupConfirmed(applicantAccountId: UUID, meetupTitle: String) = notify(
        applicantAccountId,
        PushMessage(
            title = "모임 참여가 확정됐어요",
            body = "'$meetupTitle' — 모임장이 자리를 확정했어요.",
            data = mapOf("screen" to "meetups"),
        ),
    )

    /** 새 신청이 들어왔다 — 모임장이 오픈채팅에서 맞이할 수 있게 바로 알린다. */
    @Async
    @Transactional(readOnly = true)
    fun meetupApplied(hostAccountId: UUID, meetupTitle: String, applicantNickname: String?) = notify(
        hostAccountId,
        PushMessage(
            title = "새 모임 신청이 왔어요",
            body = "'$meetupTitle' — ${applicantNickname ?: "새 신청자"} 님이 손을 들었어요.",
            data = mapOf("screen" to "my-meetups"),
        ),
    )

    /** 모임이 취소됐다 — 기다리던 신청자가 헛걸음하지 않도록 바로 알린다. */
    @Async
    @Transactional(readOnly = true)
    fun meetupCanceled(applicantAccountId: UUID, meetupTitle: String) = notify(
        applicantAccountId,
        PushMessage(
            title = "모임이 취소됐어요",
            body = "'$meetupTitle' — 모임장이 모임을 취소했어요.",
            data = mapOf("screen" to "meetups"),
        ),
    )

    /**
     * 모임의 **언제·어디서**가 바뀌었다 — 확정까지 한 사람에게는 이게 제일 중요한 정보다.
     *
     * 소개 글이나 사진이 바뀐 것까지 알리지는 않는다. 사람을 움직이게 하는 변경만 알린다 —
     * 알림이 잦아지면 정작 중요한 것도 안 읽는다.
     */
    @Async
    @Transactional(readOnly = true)
    fun meetupChanged(applicantAccountId: UUID, meetupTitle: String, what: String) = notify(
        applicantAccountId,
        PushMessage(
            title = "모임 정보가 바뀌었어요",
            body = "'$meetupTitle' — $what 확인해 주세요.",
            data = mapOf("screen" to "meetups"),
        ),
    )

    /** 이레가 지나도록 열리지 않아 회수된 편지 — 보낸 사람에게 환급 사실을 알린다. */
    @Async
    @Transactional(readOnly = true)
    fun mailExpired(senderAccountId: UUID, refund: Int) = notify(
        senderAccountId,
        PushMessage(
            title = "편지가 돌아왔어요",
            body = "7일 동안 열리지 않아 회수했어요. 잉크 $refund 이 돌아왔어요.",
            data = mapOf("screen" to "mails"),
        ),
    )

    /** 정오 이후 늦게 채워진 오늘의 상대 — 빈 채로 닫힐 뻔한 하루에 한 번 더 문을 두드린다. */
    @Async
    @Transactional(readOnly = true)
    fun peerArrived(accountId: UUID) = notify(
        accountId,
        PushMessage(
            title = "오늘의 상대가 도착했어요",
            body = "질문에 답을 남긴 한 사람이 기다리고 있어요.",
            data = mapOf("screen" to "discover"),
        ),
    )

    /**
     * 따라가던 모임의 다음 회차가 열렸다.
     * 지난번에 좋았던 자리가 다시 열렸다는 소식이라, 모임 알림 중 가장 반가운 축이다.
     */
    @Async
    @Transactional(readOnly = true)
    fun meetupSeriesOpened(accountId: UUID, meetupTitle: String) = notify(
        accountId,
        PushMessage(
            title = "다음 모임이 열렸어요",
            body = "'$meetupTitle' — 따라가던 모임의 다음 자리예요.",
            data = mapOf("screen" to "meetups"),
        ),
    )

    /** 내 초대 코드로 친구가 들어왔다 — 보상이 들어왔다는 것도 함께. */
    @Async
    @Transactional(readOnly = true)
    fun referralRewarded(inviterAccountId: UUID, ink: Int) = notify(
        inviterAccountId,
        PushMessage(
            title = "친구가 프롤로그에 들어왔어요",
            body = "초대 보상으로 잉크 $ink 을 받았어요.",
            data = mapOf("screen" to "ink"),
        ),
    )

    private fun notify(accountId: UUID, message: PushMessage) {
        val tokens = deviceTokenRepository.findAllByAccountId(accountId).map { it.token }
        pushSender.send(tokens, message)
    }

    /** 모두에게 — 매일 정해진 시각의 안내. */
    @Async
    @Transactional(readOnly = true)
    fun broadcast(message: PushMessage) = pushSender.send(deviceTokenRepository.findAllTokens(), message)
}
