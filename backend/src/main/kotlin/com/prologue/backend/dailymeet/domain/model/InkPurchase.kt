package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 스토어가 확인해 준 충전 한 건. 한 번 남기면 고치지 않는다.
 * 같은 (platform, transactionId)는 DB 유니크 제약이 막는다 — 중복 지급을 코드가 아니라 스키마가 보장한다.
 */
class InkPurchase private constructor(
    val id: UUID,
    val accountId: UUID,
    val platform: StorePlatform,
    val productId: String,
    val transactionId: String,
    val ink: Int,
    val createdAt: Instant,
) {
    companion object {
        fun record(
            accountId: UUID,
            platform: StorePlatform,
            product: InkProduct,
            transactionId: String,
            now: Instant = Instant.now(),
        ): InkPurchase {
            require(transactionId.isNotBlank()) { "거래 식별자가 비어 있습니다" }
            return InkPurchase(
                id = UUID.randomUUID(),
                accountId = accountId,
                platform = platform,
                productId = product.productId,
                transactionId = transactionId,
                ink = product.ink,
                createdAt = now,
            )
        }

        fun reconstitute(
            id: UUID,
            accountId: UUID,
            platform: StorePlatform,
            productId: String,
            transactionId: String,
            ink: Int,
            createdAt: Instant,
        ) = InkPurchase(id, accountId, platform, productId, transactionId, ink, createdAt)
    }
}
