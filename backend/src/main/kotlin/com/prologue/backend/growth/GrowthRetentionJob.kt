package com.prologue.backend.growth

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class GrowthRetentionJob(private val jdbc: JdbcTemplate) {
    @Scheduled(cron = "0 30 4 * * *", zone = "Asia/Seoul")
    @Transactional
    fun prune() {
        jdbc.update("delete from growth_events where occurred_at < now() - interval '180 days'")
    }
}
