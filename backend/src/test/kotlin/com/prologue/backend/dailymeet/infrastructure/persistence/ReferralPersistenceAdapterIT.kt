package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Referral
import com.prologue.backend.support.PostgresRepositoryTest
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

/** V71의 지급액 컬럼이 네이티브 insert·엔티티 매핑과 맞물리는지 — 유닛 테스트는 이 줄을 못 본다. */
@Import(ReferralPersistenceAdapter::class)
class ReferralPersistenceAdapterIT : PostgresRepositoryTest() {
    @Autowired private lateinit var adapter: ReferralPersistenceAdapter
    @Autowired private lateinit var referrals: ReferralJpaRepository

    @Test
    fun `초대 건에 실제 지급액이 남고, 같은 invitee의 두 번째는 조용히 거절된다`() {
        val inviter = UUID.randomUUID()
        val invitee = UUID.randomUUID()
        val first = Referral.create(inviter, invitee, "P7K3MQ", inviteeReward = 200, inviterReward = 0, now = Instant.now())

        assertTrue(adapter.saveIfNew(first))
        assertFalse(adapter.saveIfNew(Referral.create(UUID.randomUUID(), invitee, "OTHER1", 100, 100)))

        val row = referrals.findById(first.id).orElseThrow()
        assertEquals(200, row.inviteeReward)
        assertEquals(0, row.inviterReward)
        assertEquals(1, adapter.countByInviterAndCode(inviter, "P7K3MQ"))
        assertTrue(adapter.existsByInvitee(invitee))
    }
}
