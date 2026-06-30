package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.DailyReveal
import java.util.UUID

interface DailyRevealRepository {
    fun findByViewerAndQuestion(viewerAccountId: UUID, questionId: Long): DailyReveal?
    fun save(reveal: DailyReveal): DailyReveal

    /** 해당 질문에서 특정 상대 답변이 지금까지 몇 명에게 노출됐는지(공평 분배용). */
    fun countByQuestionAndPeerAnswer(questionId: Long, peerAnswerId: UUID): Long
}
