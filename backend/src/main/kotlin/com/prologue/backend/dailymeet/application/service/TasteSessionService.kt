package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.*
import com.prologue.backend.dailymeet.domain.repository.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID
import kotlin.random.Random

@Service
class TasteSessionService(
    private val sessions: TasteSessionRepository,
    private val cards: TasteCardRepository,
    private val choices: TasteChoiceRepository,
    private val rewards: TasteRewardRepository,
    private val legacy: TasteCardService,
) {
    @Transactional
    fun start(accountId: UUID, now: Instant = Instant.now()): TasteDeckView {
        rewards.lockAccount(accountId)
        val day = TasteDay.of(now)
        sessions.findDay(accountId, day)?.let { return view(it) }
        legacy.accrueRewards(accountId)
        sessions.supersedeOlder(accountId, day, now)
        return view(sessions.create(accountId, day, dailyCards(now).map { it.id }, now))
    }

    /** 홈의 미리보기는 진행 중인 묶음을 만료시키지 않는다. */
    @Transactional(readOnly = true)
    fun preview(accountId: UUID, now: Instant = Instant.now()): TasteDeckView =
        sessions.findDay(accountId, TasteDay.of(now))?.let(::view)
            ?: TasteDeckView(dailyCards(now).map(::cardView), 0, TasteDay.SIZE,
                reward(accountId, 0), resetsAt = TasteDay.resetsAt(TasteDay.of(now)))

    @Transactional(readOnly = true)
    fun get(accountId: UUID, sessionId: UUID): TasteDeckView = view(active(accountId, sessionId))

    @Transactional
    fun choose(accountId: UUID, sessionId: UUID, cardId: Long, option: TasteOption, note: String?, now: Instant = Instant.now()): TasteDeckProgress {
        rewards.lockAccount(accountId)
        val session = active(accountId, sessionId)
        if (session.cards.none { it.cardId == cardId }) throw DailyMeetException("이 묶음에 없는 카드예요")
        val card = cards.findAllOrdered().first { it.id == cardId }
        card.labelOf(option)
        val choice = choices.findByAccountIdAndCardId(accountId, cardId)?.apply { revise(option, note) }
            ?: TasteChoice.choose(accountId, cardId, option, note)
        choices.save(choice)
        sessions.answer(sessionId, cardId, option, choice.note, now)
        val answered = requireNotNull(sessions.find(accountId, sessionId)).answered
        val earned = answered == TasteDay.SIZE && rewards.claimIfNew(accountId, -session.rewardKey)
        val stats = sessions.statistics(cardId)
        val total = stats.values.sum()
        val percentages = if (total >= 10) listOfNotNull(
            TasteOption.A, TasteOption.B, card.optionC?.let { TasteOption.C }, card.optionD?.let { TasteOption.D },
        ).let { options ->
            val values = options.associateWith { ((stats[it] ?: 0) * 100L / total).toInt() }.toMutableMap()
            options.sortedByDescending { (stats[it] ?: 0) * 100L % total }
                .take(100 - values.values.sum()).forEach { values[it] = values.getValue(it) + 1 }
            values.toMap()
        } else null
        return TasteDeckProgress(answered, TasteDay.SIZE, earned, reward(accountId, answered),
            percentages?.get(option), percentages)
    }

    private fun active(accountId: UUID, id: UUID): TasteSession {
        val session = sessions.find(accountId, id) ?: throw DailyMeetException("카드 묶음을 찾을 수 없어요")
        if (session.supersededAt != null) throw DailyMeetException("새 카드 묶음을 시작했어요. 다시 들어와 주세요")
        return session
    }

    private fun dailyCards(now: Instant): List<TasteCard> {
        val pool = cards.findAllOrdered().filter { it.version == 2 }.shuffled(Random(20260908))
        check(pool.size >= TasteDay.SIZE) { "Daily taste card pool is too small" }
        val offset = Math.floorMod(TasteDay.of(now).toEpochDay() * TasteDay.SIZE, pool.size.toLong()).toInt()
        return (0 until TasteDay.SIZE).map { pool[(offset + it) % pool.size] }
    }

    private fun view(session: TasteSession): TasteDeckView {
        val byId = cards.findAllOrdered().associateBy { it.id }
        return TasteDeckView(session.cards.filter { it.option == null }.map { cardView(byId.getValue(it.cardId)) },
            session.answered, TasteDay.SIZE, reward(session.accountId, session.answered), session.id, TasteDay.resetsAt(session.deckDay))
    }

    private fun reward(accountId: UUID, answered: Int) = TasteRewardView(TasteDay.SIZE,
        TasteDay.SIZE - answered, 0, rewards.pendingCount(accountId), false)

    private fun cardView(card: TasteCard) = TasteCardView(card.id, card.prompt, card.optionA, card.optionB,
        null, null, card.optionC, card.optionD)
}
