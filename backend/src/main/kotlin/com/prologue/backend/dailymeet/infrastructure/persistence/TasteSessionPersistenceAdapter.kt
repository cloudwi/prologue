package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.TasteOption
import com.prologue.backend.dailymeet.domain.model.TasteSession
import com.prologue.backend.dailymeet.domain.model.TasteSessionCard
import com.prologue.backend.dailymeet.domain.repository.TasteSessionRepository
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.LocalDate
import java.sql.Timestamp
import java.util.UUID

@Repository
class TasteSessionPersistenceAdapter(private val jdbc: JdbcTemplate) : TasteSessionRepository {
    override fun hasSessions(accountId: UUID): Boolean =
        jdbc.queryForObject("select exists(select 1 from taste_sessions where account_id = ?)", Boolean::class.java, accountId) == true

    override fun find(accountId: UUID, id: UUID): TasteSession? =
        read("account_id = ? and id = ?", accountId, id)

    override fun findDay(accountId: UUID, day: LocalDate): TasteSession? =
        read("account_id = ? and deck_day = ?", accountId, day)

    private fun read(condition: String, vararg args: Any): TasteSession? {
        val session = jdbc.query("select * from taste_sessions where $condition", { rs, _ ->
            TasteSession(rs.getObject("id", UUID::class.java), rs.getObject("account_id", UUID::class.java),
                rs.getDate("deck_day").toLocalDate(), rs.getInt("reward_key"), rs.getTimestamp("superseded_at")?.toInstant(), emptyList())
        }, *args).firstOrNull() ?: return null
        val cards = jdbc.query("select card_id, choice from taste_session_cards where session_id = ? order by position", { rs, _ ->
            TasteSessionCard(rs.getLong("card_id"), rs.getString("choice")?.let(TasteOption::valueOf))
        }, session.id)
        return session.copy(cards = cards)
    }

    override fun create(accountId: UUID, day: LocalDate, cardIds: List<Long>, now: Instant): TasteSession {
        val id = UUID.randomUUID()
        jdbc.update("insert into taste_sessions (id, account_id, deck_day, started_at) values (?, ?, ?, ?)", id, accountId, day, Timestamp.from(now))
        jdbc.batchUpdate("insert into taste_session_cards (session_id, card_id, position) values (?, ?, ?)",
            cardIds.mapIndexed { index, cardId -> arrayOf<Any>(id, cardId, index) })
        return requireNotNull(find(accountId, id))
    }

    override fun supersedeOlder(accountId: UUID, day: LocalDate, now: Instant) {
        jdbc.update("update taste_sessions set superseded_at = ? where account_id = ? and deck_day < ? and superseded_at is null",
            Timestamp.from(now), accountId, day)
    }

    override fun answer(sessionId: UUID, cardId: Long, option: TasteOption, note: String?, now: Instant) {
        jdbc.update("update taste_session_cards set choice = ?, note = ?, answered_at = coalesce(answered_at, ?) where session_id = ? and card_id = ?",
            option.name, note, Timestamp.from(now), sessionId, cardId)
    }

    override fun statistics(cardId: Long): Map<TasteOption, Int> =
        jdbc.query("select choice, count(*) as votes from taste_choices where card_id = ? group by choice", { rs, _ ->
            TasteOption.valueOf(rs.getString("choice")) to rs.getInt("votes")
        }, cardId).toMap()
}
