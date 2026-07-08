package com.prologue.backend.auth.infrastructure.persistence

import com.prologue.backend.auth.domain.model.VerificationCode
import com.prologue.backend.auth.domain.repository.VerificationCodeRepository
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
class VerificationCodePersistenceAdapter(
    private val jpa: VerificationCodeJpaRepository,
) : VerificationCodeRepository {

    override fun save(code: VerificationCode): VerificationCode =
        jpa.save(code.toEntity()).toDomain()

    override fun findLatestActiveByEmail(email: String): VerificationCode? =
        jpa.findFirstByEmailAndConsumedAtIsNullOrderByCreatedAtDesc(email)?.toDomain()

    override fun deleteByEmail(email: String) = jpa.deleteByEmail(email)

    override fun deleteExpiredBefore(now: Instant): Int = jpa.deleteByExpiresAtBefore(now)

    private fun VerificationCode.toEntity(): VerificationCodeJpaEntity =
        VerificationCodeJpaEntity(
            id = id,
            email = email,
            codeHash = codeHash,
            expiresAt = expiresAt,
            attempts = attempts,
            consumedAt = consumedAt,
            createdAt = createdAt,
        )

    private fun VerificationCodeJpaEntity.toDomain(): VerificationCode =
        VerificationCode.reconstitute(
            id = requireNotNull(id) { "영속된 엔티티는 id를 가진다" },
            email = email,
            codeHash = codeHash,
            expiresAt = expiresAt,
            attempts = attempts,
            consumedAt = consumedAt,
            createdAt = createdAt,
        )
}
