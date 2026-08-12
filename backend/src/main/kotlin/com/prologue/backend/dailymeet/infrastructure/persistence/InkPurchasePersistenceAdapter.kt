package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.InkPurchase
import com.prologue.backend.dailymeet.domain.model.StorePlatform
import com.prologue.backend.dailymeet.domain.repository.InkPurchaseRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

interface InkPurchaseJpaRepository : JpaRepository<InkPurchaseJpaEntity, UUID> {
    fun existsByPlatformAndTransactionId(platform: StorePlatform, transactionId: String): Boolean
}

/**
 * 충전 기록 어댑터.
 *
 * 중복은 조회로 먼저 걸러내되, 최종 판정은 DB 유니크 제약에 맡긴다.
 * 두 요청이 같은 순간에 들어오면 조회는 둘 다 "없음"을 볼 수 있다 — 그 틈은 제약만이 막는다.
 */
@Repository
class InkPurchasePersistenceAdapter(
    private val jpa: InkPurchaseJpaRepository,
) : InkPurchaseRepository {

    override fun saveIfNew(purchase: InkPurchase): Boolean {
        if (exists(purchase.platform, purchase.transactionId)) return false
        return try {
            jpa.saveAndFlush(purchase.toEntity())
            true
        } catch (e: DataIntegrityViolationException) {
            false // 동시에 들어온 같은 거래 — 먼저 온 쪽이 지급한다
        }
    }

    override fun exists(platform: StorePlatform, transactionId: String): Boolean =
        jpa.existsByPlatformAndTransactionId(platform, transactionId)

    private fun InkPurchase.toEntity() = InkPurchaseJpaEntity(
        id = id,
        accountId = accountId,
        platform = platform,
        productId = productId,
        transactionId = transactionId,
        ink = ink,
        createdAt = createdAt,
    )
}
