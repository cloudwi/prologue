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
        if (fromAccountId == toAccountId) throw DailyMeetException("자신에게는 호감을 보낼 수 없어요")

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
     *
     * 사흘 안에 아무 움직임이 없던 하트는 목록에서 사라진다([ProfileAccess.WINDOW]와 같은 창).
     * 받은 호감을 무한정 쌓아두면 편지함이 보관함이 되고, "지금 답해야 할 이유"도 사라진다.
     * 서로 하트가 됐거나, 편지를 보냈거나, 잉크를 내고 프로필을 다시 연 상대는 남는다.
     */
    @Transactional(readOnly = true)
    fun receivedHearts(accountId: UUID): List<HeartPeerView> =
        heartPeers(accountId, heartRepository.findAllTo(accountId), expireStale = true) { it.fromAccountId }

    /**
     * 내가 하트를 보낸 사람들 — 답이 온 사람(상호)도, 아직인 사람도 함께.
     * 받은 하트와 같은 모양으로 준다: 상대 요약, 행동 대상 답변 id(내가 하트한 그 답), 상호·편지·잠김.
     */
    @Transactional(readOnly = true)
    fun sentHearts(accountId: UUID): List<HeartPeerView> =
        heartPeers(accountId, heartRepository.findAllFrom(accountId), expireStale = false) { it.toAccountId }

    /**
     * 하트 목록을 상대별 한 줄로 접는다 — 방향만 다르고 나머지는 같다.
     * [peerOf]가 하트에서 "상대"를 꺼낸다(받은 하트면 보낸 사람, 보낸 하트면 받는 사람).
     *
     * [expireStale]이 켜지면 창이 닫혔고 아무 움직임도 없던 하트를 걸러낸다 — 받은 목록에만 적용한다.
     * 보낸 하트는 남긴다: 편지는 창과 무관하게 언제든 보낼 수 있어서, 내가 보낸 마음의 기록은 행동 가능하다.
     */
    private fun heartPeers(
        accountId: UUID,
        hearts: List<Heart>,
        expireStale: Boolean,
        peerOf: (Heart) -> UUID,
    ): List<HeartPeerView> {
        // 잠김 판정에 필요한 것들은 사람 수와 무관하게 한 번씩만 읽는다
        val unlockedPeers = profileAccessService.unlockedPeers(accountId)
        val contactedAt = profileAccessService.lastContactedAtByPeer(accountId)

        return hearts
            .distinctBy(peerOf) // 같은 사람과 여러 날 오갔어도 한 줄
            .mapNotNull { heart ->
                val peerId = peerOf(heart)
                val peer = memberQueryService.findProfile(peerId) ?: return@mapNotNull null
                // 창은 마지막으로 마음이 오간 때부터 흐른다 — 하트가 되돌아왔다면 그때부터.
                val open = ProfileAccess.isOpen(
                    contactedAt[peerId] ?: heart.createdAt,
                    unlocked = peerId in unlockedPeers,
                )
                val mutual = heartRepository.existsFromTo(accountId, peerId) && heartRepository.existsFromTo(peerId, accountId)
                val mailSent = mailRepository.existsBySenderAndRecipient(accountId, peerId)
                // 사흘의 창이 닫혔는데 서로 하트도, 편지도, 재열람도 없었다면 — 지나간 호감이다.
                if (expireStale && !open && !mutual && !mailSent) return@mapNotNull null
                HeartPeerView(
                    nickname = peer.nickname,
                    age = peer.age(),
                    region = peer.region,
                    avatarId = peer.avatarId,
                    // 사진은 창이 열려 있을 때만. 목록에 얼굴이 남으면 잠근 의미가 없다.
                    photoUrl = if (open) peer.photoUrls.firstOrNull() else null,
                    locked = !open,
                    // 하트가 오간 질문의 상대 답변. 없으면 그 사람의 가장 최근 답으로 대신한다 —
                    // 후보 범위를 며칠치로 넓힌 뒤로는 상대가 '내가 답한 그 질문'에 답한 적이 없을 수 있고,
                    // 그때 null을 주면 카드가 아예 열리지 않아 호감이 막다른 길이 된다(2026-08-25).
                    peerAnswerId = (
                        answerRepository.findByAccountIdAndQuestionId(peerId, heart.questionId)
                            ?: answerRepository.findAllByAccountId(peerId).maxByOrNull { it.createdAt }
                        )?.id,
                    mutual = mutual,
                    mailSent = mailSent,
                    createdAt = heart.createdAt,
                )
            }
    }
}

/** 하트로 이어진 상대 한 줄(받은/보낸 공용) — 상대 요약 + 행동 대상 답변 id(null이면 행동 불가). 상호면 편지 차례. */
data class HeartPeerView(
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
