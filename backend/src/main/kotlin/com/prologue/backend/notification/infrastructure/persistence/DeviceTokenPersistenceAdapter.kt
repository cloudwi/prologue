package com.prologue.backend.notification.infrastructure.persistence

import com.prologue.backend.notification.domain.model.DeviceToken
import com.prologue.backend.notification.domain.repository.DeviceTokenRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

interface DeviceTokenJpaRepository : JpaRepository<DeviceTokenJpaEntity, UUID> {
    fun findByToken(token: String): DeviceTokenJpaEntity?
    fun findByAccountId(accountId: UUID): List<DeviceTokenJpaEntity>
    fun deleteByToken(token: String)
    fun deleteByAccountId(accountId: UUID)

    @Query("select t.token from DeviceTokenJpaEntity t")
    fun findAllTokenValues(): List<String>
}

@Repository
class DeviceTokenPersistenceAdapter(
    private val jpa: DeviceTokenJpaRepository,
) : DeviceTokenRepository {

    override fun findByToken(token: String): DeviceToken? = jpa.findByToken(token)?.toDomain()

    override fun findAllByAccountId(accountId: UUID): List<DeviceToken> =
        jpa.findByAccountId(accountId).map { it.toDomain() }

    override fun save(token: DeviceToken): DeviceToken {
        val existing = jpa.findByToken(token.token)
        if (existing != null) {
            existing.accountId = token.accountId
            existing.updatedAt = token.updatedAt
            return jpa.save(existing).toDomain()
        }
        return jpa.save(token.toEntity()).toDomain()
    }

    @Transactional
    override fun deleteByToken(token: String) = jpa.deleteByToken(token)

    @Transactional
    override fun deleteAllByAccountId(accountId: UUID) = jpa.deleteByAccountId(accountId)

    override fun findAllTokens(): List<String> = jpa.findAllTokenValues()

    private fun DeviceToken.toEntity() = DeviceTokenJpaEntity(
        id = id, accountId = accountId, token = token, platform = platform,
        createdAt = createdAt, updatedAt = updatedAt,
    )

    private fun DeviceTokenJpaEntity.toDomain() = DeviceToken.reconstitute(
        id = id, accountId = accountId, token = token, platform = platform,
        createdAt = createdAt, updatedAt = updatedAt,
    )
}
