package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/** 사용자가 시작한 10장을 고정한다. 정오가 지나도 새 묶음을 시작하기 전까지 유효하다. */
data class TasteSession(
    val id: UUID,
    val accountId: UUID,
    val deckDay: LocalDate,
    val rewardKey: Int,
    val supersededAt: Instant?,
    val cards: List<TasteSessionCard>,
) {
    val answered: Int get() = cards.count { it.option != null }
}

data class TasteSessionCard(val cardId: Long, val option: TasteOption?)

/** 문답의 새벽 5시 경계와 별개인 카드 전용 정오 경계. */
object TasteDay {
    val ZONE: ZoneId = ZoneId.of("Asia/Seoul")
    const val SIZE = 10
    fun of(now: Instant): LocalDate {
        val local = now.atZone(ZONE)
        return if (local.hour < 12) local.toLocalDate().minusDays(1) else local.toLocalDate()
    }
    fun resetsAt(day: LocalDate): Instant = day.plusDays(1).atTime(12, 0).atZone(ZONE).toInstant()
}
