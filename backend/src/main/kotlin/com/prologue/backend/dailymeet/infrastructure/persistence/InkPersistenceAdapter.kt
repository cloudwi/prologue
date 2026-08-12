package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.InkWallet
import com.prologue.backend.dailymeet.domain.repository.InkLedgerEntry
import com.prologue.backend.dailymeet.domain.repository.InkLedgerRepository
import com.prologue.backend.dailymeet.domain.repository.InkWalletRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

interface InkWalletJpaRepository : JpaRepository<InkWalletJpaEntity, UUID>
interface InkLedgerJpaRepository : JpaRepository<InkLedgerJpaEntity, UUID> {
    fun findTop50ByAccountIdOrderByCreatedAtDesc(accountId: UUID): List<InkLedgerJpaEntity>
    fun findTopByAccountIdAndReasonOrderByCreatedAtDesc(accountId: UUID, reason: String): InkLedgerJpaEntity?
}

@Repository
class InkPersistenceAdapter(
    private val walletJpa: InkWalletJpaRepository,
    private val ledgerJpa: InkLedgerJpaRepository,
) : InkWalletRepository, InkLedgerRepository {

    override fun findByAccountId(accountId: UUID): InkWallet? =
        walletJpa.findById(accountId).orElse(null)?.toDomain()

    override fun save(wallet: InkWallet): InkWallet =
        walletJpa.save(
            InkWalletJpaEntity(
                accountId = wallet.accountId,
                ink = wallet.ink,
                createdAt = wallet.createdAt,
                updatedAt = wallet.updatedAt,
            ),
        ).toDomain()

    override fun append(accountId: UUID, amount: Int, reason: String) {
        ledgerJpa.save(InkLedgerJpaEntity(accountId = accountId, amount = amount, reason = reason, createdAt = Instant.now()))
    }

    override fun latestAt(accountId: UUID, reason: String): Instant? =
        ledgerJpa.findTopByAccountIdAndReasonOrderByCreatedAtDesc(accountId, reason)?.createdAt

    override fun findRecent(accountId: UUID, limit: Int): List<InkLedgerEntry> =
        ledgerJpa.findTop50ByAccountIdOrderByCreatedAtDesc(accountId)
            .take(limit)
            .map { InkLedgerEntry(it.amount, it.reason, it.createdAt) }

    private fun InkWalletJpaEntity.toDomain(): InkWallet =
        InkWallet.reconstitute(accountId, ink, createdAt, updatedAt)
}
