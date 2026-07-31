package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.UuidGenerator
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "stamp_wallets")
class StampWalletJpaEntity(
    @Id
    @Column(name = "account_id", nullable = false, updatable = false)
    val accountId: UUID,

    @Column(name = "balance", nullable = false)
    var balance: Int,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant,
)

@Entity
@Table(name = "stamp_ledger")
class StampLedgerJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "account_id", nullable = false)
    val accountId: UUID,

    @Column(name = "amount", nullable = false)
    val amount: Int,

    @Column(name = "reason", nullable = false, length = 30)
    val reason: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
