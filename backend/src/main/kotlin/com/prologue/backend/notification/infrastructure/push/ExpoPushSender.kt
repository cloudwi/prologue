package com.prologue.backend.notification.infrastructure.push

import com.prologue.backend.notification.application.port.PushMessage
import com.prologue.backend.notification.application.port.PushSender
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import tools.jackson.databind.ObjectMapper

/**
 * Expo Push Service로 발송한다.
 *
 * FCM·APNs를 직접 붙이지 않는 이유는 키 관리와 플랫폼 분기를 Expo가 대신 해주기 때문이다.
 * (운영에서는 Expo 대시보드에 FCM 서버 키와 APNs 키를 등록해 둬야 실제로 전달된다)
 *
 * 한 번에 100건까지 보낼 수 있어 그 단위로 나눈다.
 */
@Component
class ExpoPushSender(
    restClientBuilder: RestClient.Builder,
    private val objectMapper: ObjectMapper,
    private val jdbc: JdbcTemplate,
) : PushSender {

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
                    "channelId" to "default",
                )
            }
            try {
                val raw = client.post()
                    .uri("/send")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String::class.java)
                    ?: throw IllegalStateException("Expo가 빈 응답을 돌려줬습니다")
                val response = objectMapper.readValue(raw, ExpoTicketResponse::class.java)
                response.data.zip(batch).forEach { (ticket, token) -> recordTicket(token, ticket) }
                if (response.data.size != batch.size) {
                    log.warn("Expo ticket 수가 요청과 다름 — 요청 {}건, 응답 {}건", batch.size, response.data.size)
                }
            } catch (e: Exception) {
                // 알림이 안 갔다고 편지가 안 간 것으로 만들 수는 없다. 남기고 넘어간다.
                log.warn("푸시 발송 실패 ({}건): {}", batch.size, e.message)
            }
        }
    }

    /** Expo ticket은 접수 확인일 뿐이다. 잠시 뒤 receipt를 읽어 APNs·FCM 전달 결과까지 닫는다. */
    @Scheduled(fixedDelay = RECEIPT_INTERVAL_MS, initialDelay = RECEIPT_INITIAL_DELAY_MS)
    fun checkReceipts() {
        // 운영 확인에는 한 달이면 충분하다. 성공·실패 기록을 무한히 쌓지 않는다.
        jdbc.update(
            "delete from push_delivery_tickets where status <> 'PENDING' and created_at < now() - interval '30 days'",
        )
        val pending = jdbc.query(
            """
            select ticket_id, device_token from push_delivery_tickets
            where status = 'PENDING' and created_at <= now() - interval '1 minute'
            order by created_at limit 1000
            """.trimIndent(),
            { rs, _ -> PendingTicket(rs.getString("ticket_id"), rs.getString("device_token")) },
        )
        if (pending.isEmpty()) return
        try {
            val raw = client.post()
                .uri("/getReceipts")
                .contentType(MediaType.APPLICATION_JSON)
                .body(mapOf("ids" to pending.map { it.id }))
                .retrieve()
                .body(String::class.java)
                ?: throw IllegalStateException("Expo receipt가 비어 있습니다")
            val response = objectMapper.readValue(raw, ExpoReceiptResponse::class.java)
            pending.forEach { pendingTicket ->
                val receipt = response.data[pendingTicket.id] ?: return@forEach
                val error = receipt.details?.get("error")
                val status = if (receipt.status == "ok") "DELIVERED" else "FAILED"
                jdbc.update(
                    "update push_delivery_tickets set status = ?, error = ?, checked_at = now() where ticket_id = ?",
                    status, error, pendingTicket.id,
                )
                if (error == DEVICE_NOT_REGISTERED) forgetToken(pendingTicket.token)
            }
            jdbc.update(
                """
                update push_delivery_tickets set status = 'EXPIRED', checked_at = now()
                where status = 'PENDING' and created_at < now() - interval '24 hours'
                """.trimIndent(),
            )
        } catch (e: Exception) {
            log.warn("Expo receipt 확인 실패 ({}건): {}", pending.size, e.message)
        }
    }

    private fun recordTicket(token: String, ticket: ExpoTicket) {
        if (ticket.status == "ok" && !ticket.id.isNullOrBlank()) {
            jdbc.update(
                """
                insert into push_delivery_tickets (ticket_id, device_token)
                values (?, ?) on conflict do nothing
                """.trimIndent(),
                ticket.id, token,
            )
            return
        }
        val error = ticket.details?.get("error")
        log.warn("Expo가 푸시를 거절함 — error={}, message={}", error, ticket.message)
        if (error == DEVICE_NOT_REGISTERED) forgetToken(token)
    }

    private fun forgetToken(token: String) {
        jdbc.update("delete from device_tokens where token = ?", token)
        log.info("더 이상 유효하지 않은 푸시 토큰을 제거했습니다")
    }

    data class ExpoTicketResponse(val data: List<ExpoTicket> = emptyList())
    data class ExpoTicket(
        val status: String = "error",
        val id: String? = null,
        val message: String? = null,
        val details: Map<String, String>? = null,
    )
    data class ExpoReceiptResponse(val data: Map<String, ExpoReceipt> = emptyMap())
    data class ExpoReceipt(
        val status: String = "error",
        val message: String? = null,
        val details: Map<String, String>? = null,
    )
    private data class PendingTicket(val id: String, val token: String)

    private companion object {
        const val BATCH_SIZE = 100
        const val RECEIPT_INTERVAL_MS = 15 * 60 * 1000L
        const val RECEIPT_INITIAL_DELAY_MS = 2 * 60 * 1000L
        const val DEVICE_NOT_REGISTERED = "DeviceNotRegistered"
    }
}
