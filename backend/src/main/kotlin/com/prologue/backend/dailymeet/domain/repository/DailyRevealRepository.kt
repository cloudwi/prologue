package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.DailyReveal
import java.util.UUID

interface DailyRevealRepository {
    /** 해당 질문에서 이 사용자에게 이미 공개된 상대들(공개 순). */
    fun findAllByViewerAndQuestion(viewerAccountId: UUID, questionId: Long): List<DailyReveal>
    fun save(reveal: DailyReveal): DailyReveal

    /** 해당 질문에서 특정 상대 답변이 지금까지 몇 명에게 노출됐는지(공평 분배용). */
    fun countByQuestionAndPeerAnswer(questionId: Long, peerAnswerId: UUID): Long

    /**
     * 이 사용자와 한 번이라도 이어진 적 있는 사람들 — 내가 본 상대와 나를 본 상대 양쪽 모두.
     *
     * 소개는 한쪽 화면에만 뜨지만 인연은 쌍으로 맺어진다. 내가 본 쪽만 세면
     * 이미 지나쳤던 상대가 며칠 뒤 반대 방향으로 다시 '오늘의 인연'이 된다.
     */
    fun findEverPairedAccountIds(accountId: UUID): Set<UUID>

    /**
     * 두 사람이 마지막으로 소개된 시각(방향 무관). 프로필 열람 창이 언제부터 흐르는지의 기준.
     * 소개로 이어진 적이 없으면 null.
     */
    fun findLastRevealedAtBetween(accountId: UUID, peerAccountId: UUID): java.time.Instant?

    /** 이 사용자에게 [since] 이후 공개된 상대들, 최신 공개 순 — 지난 상대 화면용. */
    fun findRecentByViewer(viewerAccountId: UUID, since: java.time.Instant): List<DailyReveal>
}
