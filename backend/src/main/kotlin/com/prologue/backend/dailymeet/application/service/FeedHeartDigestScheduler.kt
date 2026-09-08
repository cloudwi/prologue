package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.notification.application.service.NotificationService
import org.slf4j.LoggerFactory
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 피드 하트는 하루치만 한 번 묶어 알려서 작은 반응이 알림 피로가 되지 않게 한다. */
@Component
class FeedHeartDigestScheduler(
    private val jdbc: JdbcTemplate,
    private val notifications: NotificationService,
) {
    @Scheduled(cron = "0 0 21 * * *", zone = KST_ID)
    @Transactional
    fun sendDailyDigest() {
        val digests = jdbc.query(
            """
            select p.author_account_id, count(*) as heart_count, max(h.created_at) as last_heart_at
            from feed_post_hearts h
            join feed_posts p on p.id = h.post_id
            left join feed_heart_digest_deliveries d on d.author_account_id = p.author_account_id
            where h.account_id <> p.author_account_id
              and exists (select 1 from device_tokens t where t.account_id = p.author_account_id)
              and (d.last_heart_at is null or h.created_at > d.last_heart_at)
            group by p.author_account_id
            """.trimIndent(),
            { rs, _ -> Digest(
                rs.getObject("author_account_id", UUID::class.java),
                rs.getInt("heart_count"),
                rs.getTimestamp("last_heart_at").toInstant(),
            ) },
        )
        digests.forEach { digest ->
            val inserted = jdbc.update(
                """
                insert into feed_heart_digest_deliveries (author_account_id, last_heart_at, heart_count)
                values (?, ?, ?)
                on conflict (author_account_id) do update
                set last_heart_at = excluded.last_heart_at,
                    heart_count = excluded.heart_count,
                    sent_at = now()
                """.trimIndent(),
                digest.accountId, digest.lastHeartAt, digest.count,
            )
            if (inserted == 1) notifications.feedHeartsGathered(digest.accountId, digest.count)
        }
        if (digests.isNotEmpty()) log.info("피드 하트 묶음 알림 {}명", digests.size)
    }

    private data class Digest(val accountId: UUID, val count: Int, val lastHeartAt: Instant)

    private companion object {
        const val KST_ID = "Asia/Seoul"
        val log = LoggerFactory.getLogger(FeedHeartDigestScheduler::class.java)
    }
}
