package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.UuidGenerator
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "mails",
    uniqueConstraints = [UniqueConstraint(name = "uq_mail_sender_recipient", columnNames = ["sender_account_id", "recipient_account_id"])],
)
class MailJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "sender_account_id", nullable = false)
    val senderAccountId: UUID,

    @Column(name = "recipient_account_id", nullable = false)
    val recipientAccountId: UUID,

    @Column(name = "content", nullable = false, length = 300)
    val content: String,

    @Column(name = "phone", length = 20)
    val phone: String? = null,

    @Column(name = "kakao_id", length = 30)
    val kakaoId: String? = null,

    @Column(name = "status", nullable = false, length = 10)
    var status: String = "PENDING",

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
