package com.prologue.backend.dailymeet.domain.model

import java.time.Duration
import java.time.Instant

/**
 * 프로필을 볼 수 있는 기간.
 *
 * 소개도 하트도 그 순간에 답하라는 신호다. 사흘이면 마음을 정하기에 충분하고,
 * 그 뒤로도 계속 열려 있으면 목록은 답하지 않은 인연이 쌓이는 서랍이 된다.
 * 창이 닫히면 오늘 온 사람에게 눈이 간다 — 그게 이 서비스가 하루 단위인 이유다.
 *
 * 지나간 인연을 다시 보고 싶다면 잉크를 쓴다. 한 번 열면 다시 닫히지 않는다 —
 * 같은 사람을 두 번 사게 만드는 건 값을 받는 게 아니라 볼모로 잡는 것이다.
 */
object ProfileAccess {
    /** 인연이 닿은 뒤 프로필이 열려 있는 기간. */
    val WINDOW: Duration = Duration.ofDays(3)

    /**
     * [pairedAt] 시점에 이어진 상대의 프로필이 지금 열려 있는가.
     *
     * [pairedAt]이 null이면 이어진 기록 자체가 없다는 뜻 — 열지 않는다.
     * 창을 여닫는 기준은 소개받은 시각이나 하트를 주고받은 시각이지,
     * 상대가 답을 쓴 시각이 아니다. 오래된 답변으로 오늘 소개된 사람은 오늘부터 사흘이다.
     */
    fun isOpen(pairedAt: Instant?, unlocked: Boolean, now: Instant = Instant.now()): Boolean {
        if (unlocked) return true
        if (pairedAt == null) return false
        return Duration.between(pairedAt, now) < WINDOW
    }
}
