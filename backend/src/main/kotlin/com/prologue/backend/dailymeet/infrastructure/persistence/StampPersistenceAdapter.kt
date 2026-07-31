package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.StampWallet
import com.prologue.backend.dailymeet.domain.repository.StampLedgerRepository
import com.prologue.backend.dailymeet.domain.repository.StampWalletRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

interface StampWalletJpaRepository : JpaRepository<StampWalletJpaEntity, UUID>
interface StampLedgerJpaRepository : JpaRepository<StampLedgerJpaEntity, UUID>

@Repository
class StampPersistenceAdapter(
    private val walletJpa: StampWalletJpaRepository,
    private val ledgerJpa: StampLedgerJpaRepository,
) : StampWalletRepository, StampLedgerRepository {

    override fun findByAccountId(accountId: UUID): StampWallet? =
        walletJpa.findById(accountId).orElse(null)?.toDomain()

    override fun save(wallet: StampWallet): StampWallet =
        walletJpa.save(
            StampWalletJpaEntity(
                accountId = wallet.accountId,
                balance = wallet.balance,
                createdAt = wallet.createdAt,
                updatedAt = wallet.updatedAt,
            ),
        ).toDomain()

    override fun append(accountId: UUID, amount: Int, reason: String) {
        ledgerJpa.save(StampLedgerJpaEntity(accountId = accountId, amount = amount, reason = reason, createdAt = Instant.now()))
    }

    private fun StampWalletJpaEntity.toDomain(): StampWallet =
        StampWallet.reconstitute(accountId, balance, createdAt, updatedAt)
}
