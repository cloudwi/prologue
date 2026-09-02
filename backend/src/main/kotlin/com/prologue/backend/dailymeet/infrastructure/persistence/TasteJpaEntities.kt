package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** 취향 카드 (운영 시드 콘텐츠, 질문과 같은 이유로 순차 id). */
@Entity
@Table(name = "taste_cards")
class TasteCardJpaEntity(
    @Id
    @Column(name = "id")
    val id: Long,

    @Column(name = "prompt", nullable = false, length = 100)
    val prompt: String,

    @Column(name = "option_a", nullable = false, length = 60)
    val optionA: String,

    @Column(name = "option_b", nullable = false, length = 60)
    val optionB: String,
)

/** (계정, 카드)가 곧 키다 — 한 사람이 한 카드에 두 번 답할 수는 없다. */
@Embeddable
data class TasteChoiceId(
    @Column(name = "account_id", nullable = false)
    val accountId: UUID = UUID(0, 0),

    @Column(name = "card_id", nullable = false)
    val cardId: Long = 0,
) : java.io.Serializable

@Entity
@Table(name = "taste_choices")
class TasteChoiceJpaEntity(
    @EmbeddedId
    val id: TasteChoiceId,

    @Column(name = "choice", nullable = false, length = 1)
    var choice: String,

    @Column(name = "note", length = 100)
    var note: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) {
    val accountId: UUID get() = id.accountId
    val cardId: Long get() = id.cardId
}
