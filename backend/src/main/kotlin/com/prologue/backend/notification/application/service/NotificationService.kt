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

    private fun notify(accountId: UUID, message: PushMessage) {
        val tokens = deviceTokenRepository.findAllByAccountId(accountId).map { it.token }
        pushSender.send(tokens, message)
    }

    /** 모두에게 — 매일 정해진 시각의 안내. */
    @Async
    @Transactional(readOnly = true)
    fun broadcast(message: PushMessage) = pushSender.send(deviceTokenRepository.findAllTokens(), message)
}
