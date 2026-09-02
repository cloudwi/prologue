package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.TasteCard
import com.prologue.backend.dailymeet.domain.model.TasteChoice
import com.prologue.backend.dailymeet.domain.model.TasteOption
import com.prologue.backend.dailymeet.domain.repository.TasteCardRepository
import com.prologue.backend.dailymeet.domain.repository.TasteChoiceRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class TasteCardPersistenceAdapter(
    private val jpa: TasteCardJpaRepository,
) : TasteCardRepository {
    override fun findAllOrdered(): List<TasteCard> =
        jpa.findAllByOrderByIdAsc().map { TasteCard(it.id, it.prompt, it.optionA, it.optionB) }
}

@Repository
class TasteChoicePersistenceAdapter(
    private val jpa: TasteChoiceJpaRepository,
) : TasteChoiceRepository {
    override fun findAllByAccountId(accountId: UUID): List<TasteChoice> =
        jpa.findAllByAccount(accountId).map { it.toDomain() }

    override fun findByAccountIdAndCardId(accountId: UUID, cardId: Long): TasteChoice? =
        jpa.findById(TasteChoiceId(accountId, cardId)).orElse(null)?.toDomain()

    override fun findAllByAccountIds(accountIds: Collection<UUID>): List<TasteChoice> =
        if (accountIds.isEmpty()) emptyList() else jpa.findAllByAccounts(accountIds).map { it.toDomain() }

    override fun save(choice: TasteChoice): TasteChoice {
        val id = TasteChoiceId(choice.accountId, choice.cardId)
        val entity = jpa.findById(id).orElse(null)
            ?.apply { this.choice = choice.option.name; this.note = choice.note }
            ?: TasteChoiceJpaEntity(id, choice.option.name, choice.note, choice.createdAt)
        return jpa.save(entity).toDomain()
    }

    private fun TasteChoiceJpaEntity.toDomain(): TasteChoice =
        TasteChoice.reconstitute(accountId, cardId, TasteOption.valueOf(choice), note, createdAt)
}
