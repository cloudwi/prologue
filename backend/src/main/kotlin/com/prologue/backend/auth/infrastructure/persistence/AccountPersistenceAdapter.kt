package com.prologue.backend.auth.infrastructure.persistence

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.SocialConnection
import com.prologue.backend.auth.domain.model.SocialProvider
import com.prologue.backend.auth.domain.repository.AccountRepository
import org.springframework.stereotype.Repository

/**
 * AccountRepository 포트의 JPA 어댑터.
 * 도메인 ↔ JPA 엔티티 변환을 담당하며, 도메인은 JPA 존재를 모른다.
 */
@Repository
class AccountPersistenceAdapter(
    private val jpa: AccountJpaRepository,
) : AccountRepository {

    override fun findById(id: AccountId): Account? =
        jpa.findById(id.value).orElse(null)?.toDomain()

    override fun findBySocialConnection(provider: SocialProvider, providerUserId: String): Account? =
        jpa.findBySocialConnection(provider, providerUserId)?.toDomain()

    override fun save(account: Account): Account =
        jpa.save(account.toEntity()).toDomain()

    private fun Account.toEntity(): AccountJpaEntity =
        AccountJpaEntity(
            id = id.value,
            status = status,
            createdAt = createdAt,
            connections = connections
                .map { SocialConnectionEmbeddable(it.provider, it.providerUserId) }
                .toMutableSet(),
            roles = roles.toMutableSet(),
        )

    private fun AccountJpaEntity.toDomain(): Account =
        Account.reconstitute(
            id = AccountId(id),
            connections = connections.map { SocialConnection(it.provider, it.providerUserId) },
            status = status,
            roles = roles.toSet(),
            createdAt = createdAt,
        )
}
