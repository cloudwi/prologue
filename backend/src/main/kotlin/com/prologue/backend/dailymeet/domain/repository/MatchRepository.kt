package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Match
import java.util.UUID

interface MatchRepository {
    fun save(match: Match): Match
    fun exists(accountLow: UUID, accountHigh: UUID, questionId: Long): Boolean

    /** 해당 계정이 포함된 모든 매칭(최신순). */
    fun findByAccount(accountId: UUID): List<Match>
}
