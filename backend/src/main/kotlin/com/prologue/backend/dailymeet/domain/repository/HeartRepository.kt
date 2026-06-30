package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Heart
import java.util.UUID

interface HeartRepository {
    fun save(heart: Heart): Heart
    fun exists(fromAccountId: UUID, toAccountId: UUID, questionId: Long): Boolean
}
