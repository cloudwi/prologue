package com.prologue.backend.auth.infrastructure.persistence

import com.prologue.backend.auth.domain.repository.VerificationCodeRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * 만료된 인증코드 주기 정리. 검증 성공/재발급 시 대부분 정리되지만,
 * 시도하다 방치된 만료 코드가 쌓이지 않도록 하루 한 번 스윕한다.
 */
@Component
class VerificationCodeCleanupJob(
    private val repository: VerificationCodeRepository,
) {
    @Scheduled(cron = "0 0 4 * * *") // 매일 04:00 KST 근방(서버 UTC 기준 조정 가능)
    @Transactional
    fun sweepExpired() {
        val removed = repository.deleteExpiredBefore(Instant.now())
        if (removed > 0) log.info("만료된 인증코드 {}건 정리", removed)
    }

    companion object {
        private val log = LoggerFactory.getLogger(VerificationCodeCleanupJob::class.java)
    }
}
