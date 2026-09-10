package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/** 사용자가 시작한 한 벌을 고정한다. 정오가 지나도 새 묶음을 시작하기 전까지 유효하다. */
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

/**
 * 카드 한 벌의 하루 — 문답과 **같은** 경계를 쓴다([ServiceDay], 정오).
 *
 * 한때는 문답이 새벽 5시, 카드가 정오로 경계가 둘이었다. 지금은 하나다. 그래서 이 객체는
 * 자기 달력을 갖지 않고 [ServiceDay]에 물어본다 — 두 벌의 날짜 계산이 남아 있으면
 * 언젠가 한쪽만 고쳐지고, 그날 두 화면이 다른 날을 가리킨다.
 */
object TasteDay {
    val ZONE: ZoneId = ServiceDay.ZONE

    /** 한 벌의 장수. 소개 한 명을 받는 데 드는 카드 수이기도 하다([TasteReward.EVERY]). */
    const val SIZE = 5

    fun of(now: Instant): LocalDate = ServiceDay.of(now.atZone(ZONE))

    /** 이 벌이 새 벌로 갈리는 시각 — 다음 서비스 하루가 시작되는 순간. */
    fun resetsAt(day: LocalDate): Instant = ServiceDay.startOf(day.plusDays(1))
}
