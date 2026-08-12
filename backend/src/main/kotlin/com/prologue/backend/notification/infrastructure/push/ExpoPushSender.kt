package com.prologue.backend.notification.infrastructure.push

import com.prologue.backend.notification.application.port.PushMessage
import com.prologue.backend.notification.application.port.PushSender
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/**
 * Expo Push Service로 발송한다.
 *
 * FCM·APNs를 직접 붙이지 않는 이유는 키 관리와 플랫폼 분기를 Expo가 대신 해주기 때문이다.
 * (운영에서는 Expo 대시보드에 FCM 서버 키와 APNs 키를 등록해 둬야 실제로 전달된다)
 *
 * 한 번에 100건까지 보낼 수 있어 그 단위로 나눈다.
 */
@Component
class ExpoPushSender(restClientBuilder: RestClient.Builder) : PushSender {

    private val log = LoggerFactory.getLogger(javaClass)
    private val client = restClientBuilder.baseUrl("https://exp.host/--/api/v2/push").build()

    override fun send(tokens: List<String>, message: PushMessage) {
        if (tokens.isEmpty()) return
        tokens.distinct().chunked(BATCH_SIZE).forEach { batch ->
            val payload = batch.map {
                mapOf(
                    "to" to it,
                    "title" to message.title,
                    "body" to message.body,
                    "data" to message.data,
                    "sound" to "default",
                )
            }
            try {
                client.post()
                    .uri("/send")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity()
            } catch (e: Exception) {
                // 알림이 안 갔다고 편지가 안 간 것으로 만들 수는 없다. 남기고 넘어간다.
                log.warn("푸시 발송 실패 ({}건): {}", batch.size, e.message)
            }
        }
    }

    private companion object {
        const val BATCH_SIZE = 100
    }
}
