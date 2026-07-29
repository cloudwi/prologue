package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Heart
import java.util.UUID

interface HeartRepository {
    fun save(heart: Heart): Heart
    fun exists(fromAccountId: UUID, toAccountId: UUID, questionId: Long): Boolean

    /** 질문과 무관하게 from→to 하트가 하나라도 있는지. 상호 호감(매칭) 판정에 쓴다. */
    fun existsFromTo(fromAccountId: UUID, toAccountId: UUID): Boolean
}
