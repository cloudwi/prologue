package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.StorePlatform
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** stamp_purchases 매핑. 한번 저장하면 갱신하지 않는 append-only 기록. */
@Entity
@Table(name = "stamp_purchases")
class StampPurchaseJpaEntity(
    @Id @Column(name = "id", nullable = false, updatable = false) val id: UUID,
    @Column(name = "account_id", nullable = false, updatable = false) val accountId: UUID,
    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 10, updatable = false) val platform: StorePlatform,
    @Column(name = "product_id", nullable = false, length = 60, updatable = false) val productId: String,
    @Column(name = "transaction_id", nullable = false, length = 255, updatable = false) val transactionId: String,
    @Column(name = "stamps", nullable = false, updatable = false) val stamps: Int,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant,
)
