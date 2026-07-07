package com.prologue.backend.auth.infrastructure.persistence

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.EmailCredential
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

    override fun findByEmail(email: String): Account? =
        jpa.findByEmail(email)?.toDomain()

    override fun save(account: Account): Account =
        jpa.save(account.toEntity()).toDomain()

    private fun Account.toEntity(): AccountJpaEntity =
        AccountJpaEntity(
            id = id?.value, // null이면 JPA가 저장 시 생성
            email = credential.email,
            passwordHash = credential.passwordHash,
            status = status,
            createdAt = createdAt,
            roles = roles.toMutableSet(),
        )

    private fun AccountJpaEntity.toDomain(): Account =
        Account.reconstitute(
            id = AccountId(requireNotNull(id) { "영속된 엔티티는 id를 가진다" }),
            credential = EmailCredential(email, passwordHash),
            status = status,
            roles = roles.toSet(),
            createdAt = createdAt,
        )
}
