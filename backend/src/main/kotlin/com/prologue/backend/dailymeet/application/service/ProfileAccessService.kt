package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.ProfileAccess
import com.prologue.backend.dailymeet.domain.model.ProfileUnlock
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.DailyRevealRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.dailymeet.domain.repository.ProfileUnlockRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 프로필 열람 — 누구의 프로필을 지금 볼 수 있는가.
 *
 * 창이 열려 있는지는 [ProfileAccess]가 정하고, 여기서는 그 판단에 필요한
 * "언제 이어졌는가"를 모아 주고 우표로 창을 다시 여는 일을 맡는다.
 */
@Service
class ProfileAccessService(
    private val answerRepository: AnswerRepository,
    private val dailyRevealRepository: DailyRevealRepository,
    private val heartRepository: HeartRepository,
    private val mailRepository: MailRepository,
    private val profileUnlockRepository: ProfileUnlockRepository,
    private val stampService: StampService,
) {
    /** 이 사용자가 우표로 열어둔 상대들. 목록 화면은 이걸 한 번 읽어 전부 판정한다. */
    @Transactional(readOnly = true)
    fun unlockedPeers(accountId: UUID): Set<UUID> = profileUnlockRepository.findPeerAccountIds(accountId)

    /**
     * 두 사람이 마지막으로 이어진 시각 — 소개·하트·편지 중 가장 최근.
     *
     * 셋 다 봐야 한다. 소개는 한쪽 화면에만 뜨므로 나를 본 상대가 하트만 보낸 경우가 있고,
     * 소개만 받고 하트는 오가지 않은 상대도 있다. 편지는 우표를 쓰고 연락처를 건넨 상대라
     * 가장 강한 신호인데, 빠뜨리면 편지를 받아둔 사람이 사흘 뒤 잠긴다.
     */
    @Transactional(readOnly = true)
    fun pairedAt(accountId: UUID, peerAccountId: UUID): Instant? =
        listOfNotNull(
            dailyRevealRepository.findLastRevealedAtBetween(accountId, peerAccountId),
            heartRepository.findLastHeartedAtByPeer(accountId)[peerAccountId],
            mailRepository.findLastMailedAtByPeer(accountId)[peerAccountId],
        ).maxOrNull()

    /**
     * 상대별 마지막 하트·편지 시각 중 더 최근 쪽.
     * 목록 화면이 사람마다 다시 묻지 않도록 한 번에 표로 준다.
     */
    @Transactional(readOnly = true)
    fun lastContactedAtByPeer(accountId: UUID): Map<UUID, Instant> {
        val hearted = heartRepository.findLastHeartedAtByPeer(accountId)
        val mailed = mailRepository.findLastMailedAtByPeer(accountId)
        return (hearted.keys + mailed.keys).associateWith { peer ->
            maxOf(hearted[peer] ?: Instant.MIN, mailed[peer] ?: Instant.MIN)
        }
    }

    /**
     * 우표 한 장으로 상대 프로필을 다시 연다. 한 번 열면 다시 닫히지 않는다.
     *
     * 이미 열려 있으면 우표를 쓰지 않고 조용히 성공한다(멱등) — 앱이 재시도하거나
     * 버튼이 두 번 눌렸다고 두 장이 나가면 안 된다. 실패로 답하면 앱이 계속 재시도한다.
     *
     * 아직 창이 열려 있는 상대에게도 우표를 쓰지 않는다. 지금 공짜로 볼 수 있는 걸
     * 받고 파는 건 값을 받는 게 아니라 속이는 것이다.
     */
    @Transactional
    fun unlock(accountId: UUID, peerAnswerId: UUID): UnlockResult {
        val answer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val peerAccountId = answer.accountId
        if (peerAccountId == accountId) throw DailyMeetException("내 프로필이에요")

        val alreadyUnlocked = peerAccountId in profileUnlockRepository.findPeerAccountIds(accountId)
        if (alreadyUnlocked) return UnlockResult(spent = false, balance = stampService.balance(accountId))

        val pairedAt = pairedAt(accountId, peerAccountId)
            ?: throw DailyMeetException("아직 이어진 적 없는 상대예요")
        if (ProfileAccess.isOpen(pairedAt, unlocked = false)) {
            return UnlockResult(spent = false, balance = stampService.balance(accountId))
        }

        // 기록이 먼저다 — 유니크 제약이 중복 차감을 막는 자물쇠라, 우표가 먼저 나가면
        // 같은 순간에 들어온 두 요청이 두 장을 쓰고 하나만 기록될 수 있다.
        val opened = profileUnlockRepository.saveIfNew(ProfileUnlock.open(accountId, peerAccountId))
        if (!opened) return UnlockResult(spent = false, balance = stampService.balance(accountId))

        stampService.spendOne(accountId, StampService.REASON_PROFILE_UNLOCK)
        return UnlockResult(spent = true, balance = stampService.balance(accountId))
    }
}

/** 열람권 구매 결과 — [spent]가 false면 이미 열려 있어 우표를 쓰지 않았다는 뜻. */
data class UnlockResult(
    val spent: Boolean,
    val balance: Int,
)
