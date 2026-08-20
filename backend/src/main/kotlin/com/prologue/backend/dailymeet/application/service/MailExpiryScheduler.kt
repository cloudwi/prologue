package com.prologue.backend.dailymeet.application.service

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * 편지 만료 순찰 — 매일 새벽, 이레가 지나도록 열리지 않은 봉투를 회수한다.
 *
 * 새벽 3시 30분(KST)인 이유: 정오 매칭·오후 늦은 도착 채움과 겹치지 않는 한가한 시각이고,
 * 만료 푸시가 이 시각에 나가도 무음 시간대라 방해가 되지 않는다(푸시는 조용히 쌓인다).
 * 하루 한 번이면 충분하다 — 만료 기한이 이레라 몇 시간의 오차는 의미가 없다.
 */
@Component
class MailExpiryScheduler(
    private val mailService: MailService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Seoul")
    fun run() {
        try {
            val expired = mailService.expireStale()
            if (expired > 0) log.info("만료 편지 회수: {}통", expired)
        } catch (e: RuntimeException) {
            // 다음 날 다시 돈다 — 만료는 하루 늦어도 정책이 깨지지 않는다.
            log.error("편지 만료 순찰 실패", e)
        }
    }
}
