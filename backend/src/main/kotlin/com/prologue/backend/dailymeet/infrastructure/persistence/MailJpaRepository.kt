package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface MailJpaRepository : JpaRepository<MailJpaEntity, UUID> {
    fun existsBySenderAccountIdAndRecipientAccountId(senderAccountId: UUID, recipientAccountId: UUID): Boolean

    fun findBySenderAccountIdAndRecipientAccountId(senderAccountId: UUID, recipientAccountId: UUID): MailJpaEntity?

    fun findByRecipientAccountIdAndStatusNotInOrderByCreatedAtDesc(
        recipientAccountId: UUID,
        statuses: Collection<String>,
    ): List<MailJpaEntity>

    /** 이 사람에게 온 편지 중 아직 열지 않은 것 — 탈퇴할 때 보낸 사람들에게 환급하기 위해. */
    fun findByRecipientAccountIdAndStatus(recipientAccountId: UUID, status: String): List<MailJpaEntity>

    fun findBySenderAccountId(senderAccountId: UUID): List<MailJpaEntity>

    fun findByRecipientAccountId(recipientAccountId: UUID): List<MailJpaEntity>
}
