package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Conversation
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.ConversationRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 하트(호감) 유스케이스.
 * 하트는 호감 표시이고, **서로** 하트를 보냈으면 그 자리에서 대화가 열린다 — 매칭의 유일한 경로.
 * 상호 판정은 질문과 무관하다: 어제의 하트와 오늘의 하트가 만나도 호감은 호감이다.
 */
@Service
class HeartService(
    private val answerRepository: AnswerRepository,
    private val heartRepository: HeartRepository,
    private val conversationRepository: ConversationRepository,
) {
    /** 상대 답변에 하트를 보낸다. 멱등. 상호 하트면 대화를 만들고 그 id를 돌려준다. */
    @Transactional
    fun heart(fromAccountId: UUID, peerAnswerId: UUID): HeartResult {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val toAccountId = peerAnswer.accountId
        if (fromAccountId == toAccountId) throw DailyMeetException("자신에게는 하트를 보낼 수 없어요")

        if (!heartRepository.exists(fromAccountId, toAccountId, peerAnswer.questionId)) {
            heartRepository.save(Heart.send(fromAccountId, toAccountId, peerAnswer.questionId))
        }

        // 상대도 나에게 하트를 보낸 적이 있으면 — 서로 호감. 대화를 연다(이미 있으면 그 대화).
        if (!heartRepository.existsFromTo(toAccountId, fromAccountId)) {
            return HeartResult(hearted = true, matched = false, conversationId = null)
        }
        val (low, high) = if (fromAccountId.toString() <= toAccountId.toString()) {
            fromAccountId to toAccountId
        } else {
            toAccountId to fromAccountId
        }
        val conversation = conversationRepository.findBetween(low, high)
            ?: conversationRepository.save(Conversation.between(fromAccountId, toAccountId))
        return HeartResult(hearted = true, matched = true, conversationId = conversation.id)
    }
}

data class HeartResult(
    val hearted: Boolean,
    val matched: Boolean,
    val conversationId: UUID?,
)
