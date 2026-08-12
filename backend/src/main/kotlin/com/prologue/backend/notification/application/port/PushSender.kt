package com.prologue.backend.notification.application.port

/**
 * 푸시 발송 포트.
 *
 * 발송은 결코 본래 작업을 방해해서는 안 된다. 편지가 저장됐는데 알림이 실패했다고
 * 편지까지 되돌릴 수는 없다 — 구현은 예외를 밖으로 던지지 않고 삼킨다.
 */
interface PushSender {
    fun send(tokens: List<String>, message: PushMessage)
}

/**
 * @param data 앱이 알림을 탭했을 때 어디로 갈지 판단하는 값. 예: {"screen": "mails"}
 */
data class PushMessage(
    val title: String,
    val body: String,
    val data: Map<String, String> = emptyMap(),
)
