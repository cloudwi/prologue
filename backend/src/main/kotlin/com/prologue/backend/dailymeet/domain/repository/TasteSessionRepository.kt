package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.TasteOption
import com.prologue.backend.dailymeet.domain.model.TasteSession
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

interface TasteSessionRepository {
    fun hasSessions(accountId: UUID): Boolean
    fun find(accountId: UUID, id: UUID): TasteSession?
    fun findDay(accountId: UUID, day: LocalDate): TasteSession?
    fun create(accountId: UUID, day: LocalDate, cardIds: List<Long>, now: Instant): TasteSession
    fun supersedeOlder(accountId: UUID, day: LocalDate, now: Instant)
    fun answer(sessionId: UUID, cardId: Long, option: TasteOption, note: String?, now: Instant)
    fun statistics(cardId: Long): Map<TasteOption, Int>
}
