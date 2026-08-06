package com.prologue.backend.auth.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.util.UUID

/**
 * Spring Data JPA 리포지토리. 구현은 Spring이 런타임에 생성한다.
 */
interface AccountJpaRepository : JpaRepository<AccountJpaEntity, UUID> {

    /** 이메일(정규화된 형태)로 계정 조회. */
    fun findByEmail(email: String): AccountJpaEntity?

    // last_seen_at은 엔티티에 매핑하지 않고 네이티브로만 다룬다 —
    // 매핑하면 어댑터 save()가 도메인에 없는 이 값을 null로 덮어쓴다.
    @Modifying
    @Query(
        value = "update accounts set last_seen_at = :now where id = :id and (last_seen_at is null or last_seen_at < :threshold)",
        nativeQuery = true,
    )
    fun touchLastSeen(id: UUID, now: Instant, threshold: Instant): Int

    @Query(value = "select last_seen_at from accounts where id = :id", nativeQuery = true)
    fun findLastSeenAt(id: UUID): Instant?
}
