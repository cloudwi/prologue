package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class MailPersistenceAdapter(
    private val jpa: MailJpaRepository,
) : MailRepository {

    override fun save(mail: Mail): Mail =
        jpa.save(mail.toEntity()).toDomain()

    override fun findById(id: UUID): Mail? =
        jpa.findById(id).orElse(null)?.toDomain()

    override fun existsBySenderAndRecipient(senderAccountId: UUID, recipientAccountId: UUID): Boolean =
        jpa.existsBySenderAccountIdAndRecipientAccountId(senderAccountId, recipientAccountId)

    override fun findAllByRecipient(recipientAccountId: UUID): List<Mail> =
        jpa.findByRecipientAccountIdOrderByCreatedAtDesc(recipientAccountId).map { it.toDomain() }

    private fun Mail.toEntity(): MailJpaEntity =
        MailJpaEntity(
            id = id,
            senderAccountId = senderAccountId,
            recipientAccountId = recipientAccountId,
            content = content,
            phone = phone,
            kakaoId = kakaoId,
            createdAt = createdAt,
        )

    private fun MailJpaEntity.toDomain(): Mail =
        Mail.reconstitute(
            id = requireNotNull(id) { "영속된 편지는 id를 가진다" },
            senderAccountId = senderAccountId,
            recipientAccountId = recipientAccountId,
            content = content,
            phone = phone,
            kakaoId = kakaoId,
            createdAt = createdAt,
        )
}
