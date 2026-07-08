package com.prologue.backend.auth.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.UUID

interface VerificationCodeJpaRepository : JpaRepository<VerificationCodeJpaEntity, UUID> {

    /** 이메일의 가장 최근 미소비 코드. */
    fun findFirstByEmailAndConsumedAtIsNullOrderByCreatedAtDesc(email: String): VerificationCodeJpaEntity?

    fun deleteByEmail(email: String)

    @Modifying
    @Query("delete from VerificationCodeJpaEntity c where c.expiresAt < :now")
    fun deleteByExpiresAtBefore(@Param("now") now: Instant): Int
}
