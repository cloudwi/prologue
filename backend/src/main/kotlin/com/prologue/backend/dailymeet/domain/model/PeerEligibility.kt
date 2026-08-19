package com.prologue.backend.dailymeet.domain.model

import com.prologue.backend.member.domain.model.Member
import java.time.Duration
import java.time.Instant
import java.util.UUID

/**
 * 오늘의 상대가 될 수 있는 사람인가 — 자격 규칙.
 *
 * 통과하지 못하면 아예 후보가 아니다(점수를 매길 일도 없다). 점수([PeerScore])가 "누가 더 잘 맞나"를
 * 다룬다면 여기는 "애초에 소개해도 되는 사람인가"를 다룬다.
 *
 * 조건이 늘어날 때 서비스 메서드의 if 더미가 아니라 이 파일이 자라야 한다 —
 * "오늘의 상대가 될 수 있는 사람"의 정의를 한 곳에서 읽을 수 있게.
 */
object PeerEligibility {

    fun isEligible(me: Member, peer: Member, alreadyMet: Set<UUID>): Boolean =
        prefersEachOther(me, peer) &&
            hasEnoughPhotos(peer) &&
            !alreadyMetBefore(peer, alreadyMet)

    /** 나는 상대의 성별을 원하고 상대도 내 성별을 원해야 한다 — 한쪽만이면 소개가 아니라 강요다. */
    private fun prefersEachOther(me: Member, peer: Member): Boolean =
        peer.gender == me.preferredGender && peer.preferredGender == me.gender

    /** 사진 없는 프로필은 소개하지 않는다. MY 탭이 "사진이 있어야 소개돼요"라고 약속한 그 기준. */
    private fun hasEnoughPhotos(peer: Member): Boolean = peer.isVisibleToOthers()

    /** 한 번 소개된 사람은 다시 만나지 않는다 — 지나간 인연이 돌아오면 소개가 아니라 반복이다. */
    private fun alreadyMetBefore(peer: Member, alreadyMet: Set<UUID>): Boolean =
        peer.accountId in alreadyMet

    /**
     * 이미 만난 사람을 다시 소개해도 되는가 — 새 후보가 한 명도 없을 때만 묻는 예외 규칙.
     *
     * 유저가 적으면 "한 번 만난 사람은 다시 안 본다"가 며칠 만에 풀을 비운다. 그렇다고 어제 본 사람을
     * 오늘 또 내보내면 소개가 반복이 된다. 두 조건을 함께 요구한다 —
     * 마지막 소개로부터 [cooldown]이 지났고, 그 뒤에 상대가 **새 답**을 남겼을 것.
     * 새 답이 있어야 "같은 사람의 다른 이야기"지, 같은 카드를 다시 돌리는 게 아니다.
     */
    fun canReintroduce(lastRevealedAt: Instant?, answerWrittenAt: Instant, now: Instant, cooldown: Duration): Boolean =
        lastRevealedAt != null &&
            !lastRevealedAt.plus(cooldown).isAfter(now) &&
            answerWrittenAt.isAfter(lastRevealedAt)
}
