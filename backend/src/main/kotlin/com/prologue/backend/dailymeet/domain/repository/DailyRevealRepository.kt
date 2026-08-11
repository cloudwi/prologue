package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.DailyReveal
import java.util.UUID

interface DailyRevealRepository {
    /** 해당 질문에서 이 사용자에게 이미 공개된 상대들(공개 순). */
    fun findAllByViewerAndQuestion(viewerAccountId: UUID, questionId: Long): List<DailyReveal>
    fun save(reveal: DailyReveal): DailyReveal

    /** 해당 질문에서 특정 상대 답변이 지금까지 몇 명에게 노출됐는지(공평 분배용). */
    fun countByQuestionAndPeerAnswer(questionId: Long, peerAnswerId: UUID): Long

    /** 이 사용자에게 한 번이라도 소개된 상대들의 계정 id. 같은 사람을 다시 소개하지 않기 위해. */
    fun findRevealedPeerAccountIds(viewerAccountId: UUID): List<UUID>

    /** 이 사용자에게 [since] 이후 공개된 상대들, 최신 공개 순 — 지난 상대 화면용. */
    fun findRecentByViewer(viewerAccountId: UUID, since: java.time.Instant): List<DailyReveal>
}
