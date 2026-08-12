package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.model.ProfileAccess
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.notification.application.service.NotificationService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 하트(호감) 유스케이스.
 * 하트는 가벼운 신호다 — **서로** 하트를 보냈으면 마음이 통한 것. 연결(연락처 교환)은 편지가 맡는다.
 * 상호 판정은 질문과 무관하다: 어제의 하트와 오늘의 하트가 만나도 호감은 호감이다.
 * 한 사람에게는 한 번만 보낸다 — 질문마다 다시 보낼 수 있으면 호감이 신호가 아니라 빈도가 된다.
 *
 * 하트는 공짜다. 대가로 잉크를 주지도 않는다 — 공짜 행동이 유료 재화를 낳으면
 * 아무에게나 하트를 뿌리는 게 이득이 되고, 그 순간 하트는 호감의 신호이길 그만둔다.
 */
@Service
class HeartService(
    private val answerRepository: AnswerRepository,
    private val heartRepository: HeartRepository,
    private val mailRepository: MailRepository,
    private val memberQueryService: MemberQueryService,
    private val notificationService: NotificationService,
    private val profileAccessService: ProfileAccessService,
) {
    /** 상대 답변에 하트를 보낸다. 멱등. 상호 하트면 matched — 서로의 마음을 안 것. */
    @Transactional
    fun heart(fromAccountId: UUID, peerAnswerId: UUID): HeartResult {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val toAccountId = peerAnswer.accountId
        if (fromAccountId == toAccountId) throw DailyMeetException("자신에게는 하트를 보낼 수 없어요")

        // 이미 이 사람에게 보냈다면 아무 일도 일어나지 않는다(멱등).
        if (!heartRepository.existsFromTo(fromAccountId, toAccountId)) {
            heartRepository.save(Heart.send(fromAccountId, toAccountId, peerAnswer.questionId))
            // 처음 보낸 하트일 때만 알린다 — 하트는 1인 1회라 두 번 울릴 일이 없다.
            notificationService.heartArrived(toAccountId)
        }

        return HeartResult(
            hearted = true,
            matched = heartRepository.existsFromTo(toAccountId, fromAccountId),
        )
    }

    /**
     * 나에게 하트를 보낸 사람들 — 상호 하트가 된 사람도 남는다(편지를 보낼 상대라서).
     * 계정 id는 노출하지 않고, 행동 대상으로 상대 답변 id(불투명 식별자)를 준다.
     */
    @Transactional(readOnly = true)
    fun receivedHearts(accountId: UUID): List<ReceivedHeartView> {
        // 잠김 판정에 필요한 것들은 사람 수와 무관하게 한 번씩만 읽는다
        val unlockedPeers = profileAccessService.unlockedPeers(accountId)
        val contactedAt = profileAccessService.lastContactedAtByPeer(accountId)

        return heartRepository.findAllTo(accountId)
            .distinctBy { it.fromAccountId } // 같은 사람이 여러 날 보냈어도 한 줄
            .mapNotNull { heart ->
                val sender = memberQueryService.findProfile(heart.fromAccountId) ?: return@mapNotNull null
                // 창은 마지막으로 마음이 오간 때부터 흐른다 — 내가 하트를 돌려보냈다면 그때부터.
                val open = ProfileAccess.isOpen(
                    contactedAt[heart.fromAccountId] ?: heart.createdAt,
                    unlocked = heart.fromAccountId in unlockedPeers,
                )
                ReceivedHeartView(
                    nickname = sender.nickname,
                    age = sender.age(),
                    region = sender.region,
                    avatarId = sender.avatarId,
                    // 사진은 창이 열려 있을 때만. 목록에 얼굴이 남으면 잠근 의미가 없다.
                    photoUrl = if (open) sender.photoUrls.firstOrNull() else null,
                    locked = !open,
                    // 하트를 보냈다 = 그 질문에 답해 잠금을 풀었다 — 답이 없는 경우는 옛 데이터뿐.
                    peerAnswerId = answerRepository.findByAccountIdAndQuestionId(heart.fromAccountId, heart.questionId)?.id,
                    mutual = heartRepository.existsFromTo(accountId, heart.fromAccountId),
                    mailSent = mailRepository.existsBySenderAndRecipient(accountId, heart.fromAccountId),
                    createdAt = heart.createdAt,
                )
            }
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
    /** 이어진 지 사흘이 지나 프로필이 닫혔는지. true면 사진이 비어 오고, 열려면 잉크가 든다. */
    val locked: Boolean,
    val createdAt: Instant,
)

data class HeartResult(
    val hearted: Boolean,
    /** 서로 하트 — 마음이 통했다. */
    val matched: Boolean,
)
