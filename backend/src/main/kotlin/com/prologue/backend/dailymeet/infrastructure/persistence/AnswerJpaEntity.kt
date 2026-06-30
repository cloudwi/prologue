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
    name = "answers",
    uniqueConstraints = [UniqueConstraint(name = "uq_answer_account_question", columnNames = ["account_id", "question_id"])],
)
class AnswerJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "account_id", nullable = false)
    val accountId: UUID,

    @Column(name = "question_id", nullable = false)
    val questionId: Long,

    @Column(name = "content", nullable = false, length = 1000)
    var content: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
