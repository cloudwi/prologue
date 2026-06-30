package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Match
import java.util.UUID

interface MatchRepository {
    fun save(match: Match): Match
    fun exists(accountLow: UUID, accountHigh: UUID, questionId: Long): Boolean
}
