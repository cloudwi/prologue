package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 하트(호감) 유스케이스.
 * 하트는 가벼운 신호다 — **서로** 하트를 보냈으면 마음이 통한 것. 연결(연락처 교환)은 편지가 맡는다.
 * 상호 판정은 질문과 무관하다: 어제의 하트와 오늘의 하트가 만나도 호감은 호감이다.
 */
@Service
class HeartService(
    private val answerRepository: AnswerRepository,
    private val heartRepository: HeartRepository,
    private val mailRepository: MailRepository,
    private val memberQueryService: MemberQueryService,
    private val stampService: StampService,
) {
    /** 상대 답변에 하트를 보낸다. 멱등. 상호 하트면 matched — 서로의 마음을 안 것. */
    @Transactional
    fun heart(fromAccountId: UUID, peerAnswerId: UUID): HeartResult {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val toAccountId = peerAnswer.accountId
        if (fromAccountId == toAccountId) throw DailyMeetException("자신에게는 하트를 보낼 수 없어요")

        // 이미 보낸 하트면 아무 일도 일어나지 않는다 — 보상도 여기서 한 번만 걸린다(멱등).
        var stampEarned = false
        if (!heartRepository.exists(fromAccountId, toAccountId, peerAnswer.questionId)) {
            heartRepository.save(Heart.send(fromAccountId, toAccountId, peerAnswer.questionId))
            stampEarned = rewardIfMilestone(fromAccountId)
        }

        return HeartResult(
            hearted = true,
            matched = heartRepository.existsFromTo(toAccountId, fromAccountId),
            stampEarned = stampEarned,
        )
    }

    /**
     * 하트를 [HEARTS_PER_STAMP]번 보낼 때마다 우표 한 장을 돌려준다.
     * 마음을 자주 건네는 사람에게 편지 쓸 여력을 주는 장치 — 보낸 하트의 누적 수를 기준으로 한다.
     */
    private fun rewardIfMilestone(fromAccountId: UUID): Boolean {
        val sent = heartRepository.countFrom(fromAccountId)
        if (sent == 0L || sent % HEARTS_PER_STAMP != 0L) return false
        stampService.grantTo(fromAccountId, 1, StampService.REASON_HEART)
        return true
    }

    /**
     * 나에게 하트를 보낸 사람들 — 상호 하트가 된 사람도 남는다(편지를 보낼 상대라서).
     * 계정 id는 노출하지 않고, 행동 대상으로 상대 답변 id(불투명 식별자)를 준다.
     */
    @Transactional(readOnly = true)
    fun receivedHearts(accountId: UUID): List<ReceivedHeartView> =
        heartRepository.findAllTo(accountId)
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
                    mutual = heartRepository.existsFromTo(accountId, heart.fromAccountId),
                    mailSent = mailRepository.existsBySenderAndRecipient(accountId, heart.fromAccountId),
                    createdAt = heart.createdAt,
                )
            }
}

/** 받은 하트 한 줄 — 보낸 사람 요약 + 행동 대상 답변 id(null이면 행동 불가). 상호면 편지 차례. */
data class ReceivedHeartView(
    val nickname: String,
    val age: Int,
    val region: String,
    val avatarId: Int?,
    val photoUrl: String?,
    val peerAnswerId: UUID?,
    /** 서로 하트를 주고받았는지 — true면 하트 되보내기 대신 편지를 보낼 차례다. */
    val mutual: Boolean,
    /** 내가 이미 편지를 보냈는지 — true면 편지 쓰기 대신 보낸 편지 확인. */
    val mailSent: Boolean,
    val createdAt: Instant,
)

data class HeartResult(
    val hearted: Boolean,
    /** 서로 하트 — 마음이 통했다. */
    val matched: Boolean,
    /** 이번 하트로 우표를 받았는지 — 화면이 알려줄 수 있게. */
    val stampEarned: Boolean = false,
)

/** 하트 몇 번마다 우표 한 장을 돌려줄지. */
private const val HEARTS_PER_STAMP = 5L
