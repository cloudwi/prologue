package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Conversation
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Message
import com.prologue.backend.dailymeet.domain.repository.ConversationRepository
import com.prologue.backend.dailymeet.domain.repository.MessageRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 대화방 메시지(내 것 여부 포함). */
data class MessageView(
    val id: UUID,
    val content: String,
    val mine: Boolean,
    val createdAt: Instant,
)

/** 대화방 1:1 문답(메시지) 유스케이스. 참여자만 읽고 쓸 수 있다. */
@Service
class MessageService(
    private val conversationRepository: ConversationRepository,
    private val messageRepository: MessageRepository,
) {
    @Transactional
    fun send(accountId: UUID, conversationId: UUID, content: String): MessageView {
        assertParticipant(conversationId, accountId)
        val saved = messageRepository.save(Message.write(conversationId, accountId, content))
        return MessageView(requireNotNull(saved.id), saved.content, true, saved.createdAt)
    }

    @Transactional(readOnly = true)
    fun list(accountId: UUID, conversationId: UUID): List<MessageView> {
        assertParticipant(conversationId, accountId)
        return messageRepository.findByConversationOrdered(conversationId).map {
            MessageView(requireNotNull(it.id), it.content, it.senderAccountId == accountId, it.createdAt)
        }
    }

    private fun assertParticipant(conversationId: UUID, accountId: UUID): Conversation {
        val conv = conversationRepository.findById(conversationId)
            ?: throw DailyMeetException("대화를 찾을 수 없어요")
        if (conv.accountLow != accountId && conv.accountHigh != accountId) {
            throw DailyMeetException("이 대화의 참여자가 아니에요")
        }
        return conv
    }
}
