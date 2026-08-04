package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.model.MailStatus
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

    override fun findBySenderAndRecipient(senderAccountId: UUID, recipientAccountId: UUID): Mail? =
        jpa.findBySenderAccountIdAndRecipientAccountId(senderAccountId, recipientAccountId)?.toDomain()

    override fun findAllByRecipient(recipientAccountId: UUID): List<Mail> =
        // 거절한 편지는 조용히 사라진 것 — 받은 목록에 다시 올리지 않는다.
        jpa.findByRecipientAccountIdAndStatusNotOrderByCreatedAtDesc(recipientAccountId, MailStatus.DECLINED.name)
            .map { it.toDomain() }

    private fun Mail.toEntity(): MailJpaEntity =
        MailJpaEntity(
            id = id,
            senderAccountId = senderAccountId,
            recipientAccountId = recipientAccountId,
            content = content,
            phone = phone,
            kakaoId = kakaoId,
            status = status.name,
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
            status = MailStatus.valueOf(status),
            createdAt = createdAt,
        )
}
