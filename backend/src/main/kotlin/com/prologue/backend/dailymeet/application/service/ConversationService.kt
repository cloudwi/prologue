package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.Conversation
import com.prologue.backend.dailymeet.domain.model.ConversationRequest
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.ConversationRepository
import com.prologue.backend.dailymeet.domain.repository.ConversationRequestRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Gender
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 받은 대화 신청(블라인드 — 신청자 신원 대신 답변만 노출). */
data class ReceivedRequestView(
    val requestId: UUID,
    val questionId: Long,
    val questionContent: String,
    val requesterAnswer: String,
    val createdAt: Instant,
)

/** 성사된 대화 상대(수락 후 프로필 공개). */
data class ConversationView(
    val conversationId: UUID,
    val peerAccountId: UUID,
    val nickname: String,
    val gender: Gender,
    /** 만 나이(서버 계산). 생년월일 원본은 상대에게 노출하지 않는다. */
    val age: Int,
    val region: String,
    val avatarId: Int?,
    /** 대표 사진(첫 장). 사진이 필수라 비어 있는 건 옛 데이터뿐 — 그땐 아바타로 대신한다. */
    val photoUrl: String?,
    val createdAt: Instant,
)

/**
 * 대화 신청/수락 유스케이스. 하트(호감)와 별개로, 상대 답변을 보고 대화를 신청하고
 * 상대가 수락하면 대화가 시작된다.
 */
@Service
class ConversationService(
    private val answerRepository: AnswerRepository,
    private val questionRepository: QuestionRepository,
    private val memberQueryService: MemberQueryService,
    private val requestRepository: ConversationRequestRepository,
    private val conversationRepository: ConversationRepository,
    private val profileLetterService: ProfileLetterService,
    private val stampService: StampService,
) {
    /** 상대 답변(peerAnswerId)을 보고 대화를 신청한다. 우표 1장을 쓴다 — 편지를 부치는 값. */
    @Transactional
    fun sendRequest(requesterAccountId: UUID, peerAnswerId: UUID): UUID {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val addresseeId = peerAnswer.accountId
        if (requesterAccountId == addresseeId) throw DailyMeetException("자신에게는 대화를 신청할 수 없어요")
        if (conversationRepository.existsBetween(low(requesterAccountId, addresseeId), high(requesterAccountId, addresseeId))) {
            throw DailyMeetException("이미 대화 중인 상대예요")
        }
        if (requestRepository.existsPending(requesterAccountId, addresseeId)) {
            throw DailyMeetException("이미 대화를 신청했어요")
        }
        // 검증을 모두 통과한 뒤에 소모 — 같은 트랜잭션이라 신청 저장이 실패하면 우표도 돌아간다.
        stampService.spendOne(requesterAccountId, StampService.REASON_CONVERSATION_REQUEST)
        val saved = requestRepository.save(
            ConversationRequest.create(requesterAccountId, addresseeId, peerAnswer.questionId),
        )
        return requireNotNull(saved.id)
    }

    /** 내가 받은 대기 중 대화 신청 목록(신청자 답변만, 신원 비공개). */
    @Transactional(readOnly = true)
    fun receivedRequests(accountId: UUID): List<ReceivedRequestView> {
        val questions = questionRepository.findAllOrdered().associateBy { it.id }
        return requestRepository.findPendingByAddressee(accountId).mapNotNull { req ->
            val requesterAnswer = answerRepository.findByAccountIdAndQuestionId(req.requesterAccountId, req.questionId)
                ?: return@mapNotNull null
            ReceivedRequestView(
                requestId = requireNotNull(req.id),
                questionId = req.questionId,
                questionContent = questions[req.questionId]?.content ?: "",
                requesterAnswer = requesterAnswer.content,
                createdAt = req.createdAt,
            )
        }
    }

    /** 대화 신청 수락 → 대화 생성. 대화 id 반환. */
    @Transactional
    fun accept(accountId: UUID, requestId: UUID): UUID {
        val req = requestRepository.findById(requestId) ?: throw DailyMeetException("대화 신청을 찾을 수 없어요")
        if (req.addresseeAccountId != accountId) throw DailyMeetException("내가 받은 신청만 수락할 수 있어요")
        req.accept()
        requestRepository.save(req)
        val conversation = Conversation.between(req.requesterAccountId, req.addresseeAccountId)
        val saved = if (conversationRepository.existsBetween(conversation.accountLow, conversation.accountHigh)) {
            conversationRepository.findByAccount(accountId).first { it.accountLow == conversation.accountLow && it.accountHigh == conversation.accountHigh }
        } else {
            conversationRepository.save(conversation)
        }
        return requireNotNull(saved.id)
    }

    /** 대화 신청 거절. */
    @Transactional
    fun reject(accountId: UUID, requestId: UUID) {
        val req = requestRepository.findById(requestId) ?: throw DailyMeetException("대화 신청을 찾을 수 없어요")
        if (req.addresseeAccountId != accountId) throw DailyMeetException("내가 받은 신청만 거절할 수 있어요")
        req.reject()
        requestRepository.save(req)
    }

    /** 내 대화 목록(상대 프로필 공개). */
    @Transactional(readOnly = true)
    fun myConversations(accountId: UUID): List<ConversationView> =
        conversationRepository.findByAccount(accountId).mapNotNull { conv ->
            val peerId = if (conv.accountLow == accountId) conv.accountHigh else conv.accountLow
            val profile = memberQueryService.findProfile(peerId) ?: return@mapNotNull null
            ConversationView(
                conversationId = requireNotNull(conv.id),
                peerAccountId = peerId,
                nickname = profile.nickname,
                gender = profile.gender,
                age = profile.age(),
                region = profile.region,
                avatarId = profile.avatarId,
                photoUrl = profile.photoUrls.firstOrNull(),
                createdAt = conv.createdAt,
            )
        }

    /**
     * 대화 상대의 프로필 상세(청첩장) — 대화 참여자만 볼 수 있다.
     * 오늘의 답변 필드는 비운다(여긴 이미 매칭된 사이, 문답은 대화방에서 이어진다).
     */
    @Transactional(readOnly = true)
    fun peerProfile(accountId: UUID, conversationId: UUID): PeerView {
        val conv = conversationRepository.findByAccount(accountId).firstOrNull { it.id == conversationId }
            ?: throw DailyMeetException("대화를 찾을 수 없어요")
        val peerId = if (conv.accountLow == accountId) conv.accountHigh else conv.accountLow
        val p = memberQueryService.findProfile(peerId) ?: throw DailyMeetException("상대 프로필을 찾을 수 없어요")
        return PeerView(
            peerAnswerId = null,
            peerAnswer = null,
            answerUnlocked = false,
            photoUrls = p.photoUrls,
            nickname = p.nickname,
            letters = profileLetterService.lettersOf(peerId),
            gender = p.gender,
            age = p.age(),
            region = p.region,
            bio = p.bio,
            heightCm = p.heightCm,
            bodyType = p.bodyType,
            hobbies = p.hobbies,
            interests = p.interests,
            strengths = p.strengths,
            avatarId = p.avatarId,
        )
    }

    private fun low(a: UUID, b: UUID): UUID = if (a.toString() <= b.toString()) a else b
    private fun high(a: UUID, b: UUID): UUID = if (a.toString() <= b.toString()) b else a
}
