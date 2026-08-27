package com.prologue.backend.dailymeet.domain.model

import com.prologue.backend.member.domain.model.Member
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
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

    /** 나이를 세는 기준 시간대 — Member.age()와 같아야 하루 차이로 판정이 갈리지 않는다. */
    private val KST = ZoneId.of("Asia/Seoul")


    fun isEligible(
        me: Member,
        peer: Member,
        alreadyMet: Set<UUID>,
        today: LocalDate = LocalDate.now(KST),
    ): Boolean =
        prefersEachOther(me, peer) &&
            withinEachOthersAgeRange(me, peer, today) &&
            hasEnoughPhotos(peer) &&
            !alreadyMetBefore(peer, alreadyMet)

    /**
     * 나는 상대의 성별을 원하고 상대도 내 성별을 원해야 한다 — 한쪽만이면 소개가 아니라 강요다.
     *
     * 선호 성별이 비어 있으면 이 식은 저절로 거짓이 된다. 그게 모임만 하러 온 사람이 소개에서
     * 빠지는 방식이다 — 따로 플래그를 두지 않는다. 원하는 바가 없으면 오가지 않는다.
     */
    private fun prefersEachOther(me: Member, peer: Member): Boolean =
        me.preferredGender != null &&
            peer.preferredGender != null &&
            peer.gender == me.preferredGender &&
            peer.preferredGender == me.gender

    /**
     * 서로가 정한 나이대 안에 들어와야 한다.
     *
     * 나이는 [PeerScore]에서도 쓰이지만 그건 순서의 문제다 — 나이 차가 벌어질수록 뒤로 밀릴 뿐,
     * 스물아홉이 마흔을 소개받는 날은 여전히 생긴다. 본인이 정한 범위는 자격의 문제라 여기서 본다.
     *
     * 성별 선호와 같은 원칙으로 **양쪽 모두**를 본다. 내 범위에 상대가 들어와도 상대의 범위에
     * 내가 없으면 소개하지 않는다 — 한쪽만 원하는 건 소개가 아니라 강요다.
     *
     * 비워둔 쪽은 조건을 걸지 않는다. 그래서 아무도 범위를 정하지 않은 지금은 이 규칙이
     * 있으나 없으나 같고, 정한 사람에게만 조여든다.
     */
    private fun withinEachOthersAgeRange(me: Member, peer: Member, today: LocalDate): Boolean =
        fits(peer.age(today), me.minAge, me.maxAge) && fits(me.age(today), peer.minAge, peer.maxAge)

    private fun fits(age: Int, min: Int?, max: Int?): Boolean =
        (min == null || age >= min) && (max == null || age <= max)

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
