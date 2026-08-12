package com.prologue.backend.notification.application.service

import com.prologue.backend.notification.application.port.PushMessage
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * 매일 정해진 시각의 안내.
 *
 * 아침에 오늘의 질문을 알리고, 정오에 상대가 공개됐음을 알린다.
 * 밤에는 보내지 않는다 — 서비스 알림이라 법적 제약은 없지만, 잠을 깨우는 앱은 지워진다.
 *
 * 인스턴스가 잠들면 그 시각을 놓칠 수 있다(무료 호스팅). 놓친 안내를 나중에 몰아 보내지는
 * 않는다 — 오후 3시에 "오늘의 질문이 도착했어요"는 안 보내느니만 못하다.
 */
@Component
class DailyNotificationScheduler(
    private val notificationService: NotificationService,
) {
    /** 아침 9시(KST) — 오늘의 질문 안내. 답을 남겨야 상대를 만날 수 있다는 것도 함께. */
    @Scheduled(cron = "0 0 9 * * *", zone = KST)
    fun notifyNewQuestion() = notificationService.broadcast(
        PushMessage(
            title = "오늘의 질문이 도착했어요",
            body = "답을 남기면 정오에 오늘의 인연을 만나요.",
            data = mapOf("screen" to "discover"),
        ),
    )

    /** 정오(KST) — 오늘의 상대 공개. */
    @Scheduled(cron = "0 0 12 * * *", zone = KST)
    fun notifyPeersRevealed() = notificationService.broadcast(
        PushMessage(
            title = "오늘의 인연이 공개됐어요",
            body = "어떤 분이 같은 질문에 답했는지 확인해 보세요.",
            data = mapOf("screen" to "discover"),
        ),
    )

    private companion object {
        const val KST = "Asia/Seoul"
    }
}
