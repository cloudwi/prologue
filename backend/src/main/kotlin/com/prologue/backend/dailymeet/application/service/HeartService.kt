package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Conversation
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.ConversationRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
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
    private val memberQueryService: MemberQueryService,
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

    /**
     * 나에게 하트를 보낸 사람들 — 아직 상호가 아닌 하트만(서로 하트면 이미 대화 목록에 있다).
     * 계정 id는 노출하지 않고, 돌려보낼 대상으로 상대 답변 id(불투명 식별자)를 준다.
     */
    @Transactional(readOnly = true)
    fun receivedHearts(accountId: UUID): List<ReceivedHeartView> =
        heartRepository.findAllTo(accountId)
            .filterNot { heartRepository.existsFromTo(accountId, it.fromAccountId) }
            .distinctBy { it.fromAccountId } // 같은 사람이 여러 날 보냈어도 한 줄
            .mapNotNull { heart ->
                val sender = memberQueryService.findProfile(heart.fromAccountId) ?: return@mapNotNull null
                ReceivedHeartView(
                    nickname = sender.nickname,
                    age = sender.age(),
                    region = sender.region,
                    avatarId = sender.avatarId,
                    photoUrl = sender.photoUrls.firstOrNull(),
                    // 하트를 보냈다 = 그 질문에 답해 잠금을 풀었다 — 답이 없는 경우는 옛 데이터뿐.
                    peerAnswerId = answerRepository.findByAccountIdAndQuestionId(heart.fromAccountId, heart.questionId)?.id,
                    createdAt = heart.createdAt,
                )
            }
}

/** 받은 하트 한 줄 — 보낸 사람 요약 + 하트를 돌려보낼 답변 id(null이면 되보내기 불가). */
data class ReceivedHeartView(
    val nickname: String,
    val age: Int,
    val region: String,
    val avatarId: Int?,
    val photoUrl: String?,
    val peerAnswerId: UUID?,
    val createdAt: Instant,
)

data class HeartResult(
    val hearted: Boolean,
    val matched: Boolean,
    val conversationId: UUID?,
)
