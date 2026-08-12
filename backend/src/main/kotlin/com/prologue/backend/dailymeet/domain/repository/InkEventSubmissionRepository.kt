package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.InkEventSubmission
import java.util.UUID

interface InkEventSubmissionRepository {
    fun save(submission: InkEventSubmission): InkEventSubmission
    fun findById(id: UUID): InkEventSubmission?

    /** 내 제출 이력, 최신순. */
    fun findByAccountId(accountId: UUID): List<InkEventSubmission>

    /** 검토 대기 목록 — 먼저 낸 사람부터(오래된 순). */
    fun findPending(): List<InkEventSubmission>

    /** 검토 중인 제출이 이미 있는가 — 중복 제출 방지. */
    fun existsPendingByAccountId(accountId: UUID): Boolean
}
