package com.prologue.backend.notification.application.service

import com.prologue.backend.notification.application.port.PushMessage
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * 매일 정해진 시각의 안내 — 정오 한 번.
 *
 * 처음엔 아침 9시(오늘의 질문)와 정오(상대 공개) 두 번이었다. 하루 두 번은 서비스 알림치고 잦고,
 * 두 알림이 결국 같은 화면(발견)으로 데려간다. 정오 한 번에 "답을 남기면 만난다"를 함께 말하는 편이
 * 덜 성가시고 더 또렷하다. 밤에는 보내지 않는다 — 잠을 깨우는 앱은 지워진다.
 *
 * 인스턴스가 잠들면 그 시각을 놓칠 수 있다(무료 호스팅). 놓친 안내를 나중에 몰아 보내지는
 * 않는다 — 오후 3시에 "오늘의 인연이 도착했어요"는 안 보내느니만 못하다.
 */
@Component
class DailyNotificationScheduler(
    private val notificationService: NotificationService,
) {
    /** 정오(KST) — 오늘의 상대 공개. 아직 답하지 않은 사람에게는 "답을 남기면 만난다"는 안내를 겸한다. */
    @Scheduled(cron = "0 0 12 * * *", zone = KST)
    fun notifyPeersRevealed() = notificationService.broadcast(
        PushMessage(
            title = "오늘의 인연이 도착했어요",
            body = "오늘의 질문에 답을 남기고, 같은 질문에 답한 사람을 만나보세요.",
            data = mapOf("screen" to "discover"),
        ),
    )

    private companion object {
        const val KST = "Asia/Seoul"
    }
}
