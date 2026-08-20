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
        // 거절했거나 보낸 사람이 되찾아갔거나 기한이 지나 사라진 편지는 받은 목록에 다시 올리지 않는다.
        jpa.findByRecipientAccountIdAndStatusNotInOrderByCreatedAtDesc(
            recipientAccountId,
            listOf(MailStatus.DECLINED.name, MailStatus.RECALLED.name, MailStatus.EXPIRED.name),
        ).map { it.toDomain() }

    override fun findPendingTo(recipientAccountId: UUID): List<Mail> =
        jpa.findByRecipientAccountIdAndStatus(recipientAccountId, MailStatus.PENDING.name).map { it.toDomain() }

    override fun findAllPendingBefore(cutoff: java.time.Instant): List<Mail> =
        jpa.findByStatusAndCreatedAtBefore(MailStatus.PENDING.name, cutoff).map { it.toDomain() }

    /**
     * 보낸 편지와 받은 편지를 각각 읽어 상대별 최신 시각으로 접는다.
     * 거절한 편지도 센다 — 거절은 프로필을 닫는 일과 무관하고, 인연이 닿았던 사실 자체는 남는다.
     */
    override fun findLastMailedAtByPeer(accountId: UUID): Map<UUID, java.time.Instant> {
        val sent = jpa.findBySenderAccountId(accountId).map { it.recipientAccountId to it.createdAt }
        val received = jpa.findByRecipientAccountId(accountId).map { it.senderAccountId to it.createdAt }
        return (sent + received)
            .groupBy({ it.first }, { it.second })
            .mapValues { (_, times) -> times.max() }
    }

    private fun Mail.toEntity(): MailJpaEntity =
        MailJpaEntity(
            id = id,
            senderAccountId = senderAccountId,
            recipientAccountId = recipientAccountId,
            content = content,
            phone = phone,
            kakaoId = kakaoId,
            inkPaid = inkPaid,
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
            inkPaid = inkPaid,
            status = MailStatus.valueOf(status),
            createdAt = createdAt,
        )
}
