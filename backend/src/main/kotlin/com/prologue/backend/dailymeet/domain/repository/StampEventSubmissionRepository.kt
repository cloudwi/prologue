package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.StampEventSubmission
import java.util.UUID

interface StampEventSubmissionRepository {
    fun save(submission: StampEventSubmission): StampEventSubmission
    fun findById(id: UUID): StampEventSubmission?

    /** 내 제출 이력, 최신순. */
    fun findByAccountId(accountId: UUID): List<StampEventSubmission>

    /** 검토 대기 목록 — 먼저 낸 사람부터(오래된 순). */
    fun findPending(): List<StampEventSubmission>

    /** 검토 중인 제출이 이미 있는가 — 중복 제출 방지. */
    fun existsPendingByAccountId(accountId: UUID): Boolean
}
