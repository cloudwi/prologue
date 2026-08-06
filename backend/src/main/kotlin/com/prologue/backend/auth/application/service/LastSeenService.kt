package com.prologue.backend.auth.application.service

import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.repository.AccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * 계정의 최근 접속(last_seen_at) 기록·조회.
 * 인증 필터가 요청마다 [touch]를 부르므로 두 겹으로 스로틀한다 —
 * 인메모리 캐시로 대부분의 요청은 DB에 가지도 않고, DB UPDATE도 조건부라 멱등하다.
 */
@Service
class LastSeenService(
    private val accountRepository: AccountRepository,
) {
    private val recentlyTouched = ConcurrentHashMap<UUID, Instant>()

    @Transactional
    fun touch(accountId: UUID) {
        val now = Instant.now()
        val cached = recentlyTouched[accountId]
        if (cached != null && Duration.between(cached, now) < THROTTLE) return
        recentlyTouched[accountId] = now
        accountRepository.touchLastSeen(AccountId(accountId), now, now.minus(THROTTLE))
    }

    @Transactional(readOnly = true)
    fun lastSeenAt(accountId: UUID): Instant? =
        accountRepository.findLastSeenAt(AccountId(accountId))

    companion object {
        private val THROTTLE: Duration = Duration.ofHours(1)
    }
}
