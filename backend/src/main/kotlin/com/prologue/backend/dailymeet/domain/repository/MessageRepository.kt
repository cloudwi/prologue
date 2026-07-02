package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Message
import java.util.UUID

interface MessageRepository {
    fun save(message: Message): Message
    fun findByConversationOrdered(conversationId: UUID): List<Message>
}
