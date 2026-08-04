package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface MailJpaRepository : JpaRepository<MailJpaEntity, UUID> {
    fun existsBySenderAccountIdAndRecipientAccountId(senderAccountId: UUID, recipientAccountId: UUID): Boolean

    fun findBySenderAccountIdAndRecipientAccountId(senderAccountId: UUID, recipientAccountId: UUID): MailJpaEntity?

    fun findByRecipientAccountIdOrderByCreatedAtDesc(recipientAccountId: UUID): List<MailJpaEntity>
}
