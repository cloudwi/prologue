package com.prologue.backend.notification.application.service

import com.prologue.backend.notification.application.port.PushMessage
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * 매일 정해진 시각의 안내 — 밤 9시 한 번.
 *
 * 처음엔 아침 9시(오늘의 질문)와 정오(상대 공개) 두 번이었다. 하루 두 번은 서비스 알림치고 잦고,
 * 두 알림이 결국 같은 화면(발견)으로 데려간다. 한 번에 "답을 남기면 만난다"를 말하는 편이
 * 덜 성가시고 더 또렷하다. 밤 늦게는 보내지 않는다 — 잠을 깨우는 앱은 지워진다.
 *
 * 시각이 정오에서 밤 9시로 옮겨온 건 공개 시각이 사라졌기 때문이다(2026-08-25). 예전에는
 * 정오가 상대가 도착하는 시각이라 그때 부르는 게 당연했지만, 이제 도착은 답을 남기는 순간이라
 * "언제 부를까"는 순전히 "언제 답을 쓸 여유가 있나"의 문제가 됐다 — 그건 밤이다.
 *
 * 인스턴스가 잠들면 그 시각을 놓칠 수 있다(무료 호스팅). 놓친 안내를 나중에 몰아 보내지는
 * 않는다 — 새벽 1시에 "오늘의 질문이 기다려요"는 안 보내느니만 못하다.
 */
@Component
class DailyNotificationScheduler(
    private val notificationService: NotificationService,
) {
    /**
     * 밤 9시(KST) — 하루 중 답을 쓸 여유가 가장 많은 시각.
     * 이미 답한 사람에게도 같이 가지만, 문구가 "답을 남기면 만난다"라 답한 사람에게는
     * 오늘의 상대를 보러 오라는 말로 읽힌다. 미답변자만 골라 보내려면 토큰과 답변을
     * 조인해야 하는데, 그 비용은 사람이 많아진 뒤에 치르는 게 맞다.
     */
    @Scheduled(cron = "0 0 21 * * *", zone = KST)
    fun notifyDailyQuestion() = notificationService.broadcast(
        PushMessage(
            title = "오늘의 질문이 기다리고 있어요",
            body = "답을 남기면 오늘의 한 사람이 도착해요.",
            data = mapOf("screen" to "discover"),
        ),
    )

    private companion object {
        const val KST = "Asia/Seoul"
    }
}
