package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Conversation
import java.util.UUID

interface ConversationRepository {
    fun save(conversation: Conversation): Conversation
    fun existsBetween(accountLow: UUID, accountHigh: UUID): Boolean
    fun findBetween(accountLow: UUID, accountHigh: UUID): Conversation?
    fun findByAccount(accountId: UUID): List<Conversation>
    fun findById(id: UUID): Conversation?
}
