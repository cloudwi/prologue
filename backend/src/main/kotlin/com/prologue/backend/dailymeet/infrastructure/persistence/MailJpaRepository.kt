package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface MailJpaRepository : JpaRepository<MailJpaEntity, UUID> {
    fun existsBySenderAccountIdAndRecipientAccountId(senderAccountId: UUID, recipientAccountId: UUID): Boolean

    fun findBySenderAccountIdAndRecipientAccountId(senderAccountId: UUID, recipientAccountId: UUID): MailJpaEntity?

    fun findByRecipientAccountIdAndStatusNotOrderByCreatedAtDesc(recipientAccountId: UUID, status: String): List<MailJpaEntity>

    fun findBySenderAccountId(senderAccountId: UUID): List<MailJpaEntity>

    fun findByRecipientAccountId(recipientAccountId: UUID): List<MailJpaEntity>
}
