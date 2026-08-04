package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Report

interface ReportRepository {
    fun save(report: Report): Report

    /** 최근 신고, 최신순 — 어드민 검토용. */
    fun findRecent(limit: Int): List<Report>
}
