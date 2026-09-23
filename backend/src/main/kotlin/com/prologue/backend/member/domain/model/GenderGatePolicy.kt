package com.prologue.backend.member.domain.model

import kotlin.math.floor

/**
 * 성비 게이트 — 신규 남성을 언제 들일 것인가.
 *
 * 소개팅 앱은 성비가 생사다. 남초로 기울면 여성 한 명이 하루에 여러 번 소개되고, 하트와
 * 알림이 쌓여 여성이 먼저 떠난다. 여성이 떠나면 남성도 아무도 못 만난다 — 남성을 많이 들이는
 * 것이 남성에게도 손해가 되는 구조다. 그래서 여성은 바로 들이고, 남성은 비율에 맞춰 들인다.
 *
 * 노출 상한(daily.max-exposure-per-day)이 "이미 들어온 사람"의 피로를 막는 장치라면,
 * 이 게이트는 "들어오는 수" 자체를 조절하는 장치다. 둘은 겹치지 않는다.
 *
 * 스위치는 기본이 꺼짐이고 켜는 결정은 운영자가 한다([enabled] — 설정 `gate.enabled`).
 * 꺼져 있으면 대기 행이 있어도 전원 입장과 같다 — 표는 기록이고 결정은 설정이 한다.
 */
class GenderGatePolicy(
    val enabled: Boolean,
    /**
     * 활성 여성/활성 남성이 이 값 이상이어야 남성을 더 들인다. 0.8이면 남성 10명당 여성 8명.
     *
     * 1.0(1:1)로 두지 않는 이유 — 소개팅 앱은 남성 가입이 언제나 많아 1:1을 기다리면 줄이
     * 영영 안 줄고, 0.8 정도면 노출 상한과 합쳐 여성 쪽 피로가 견딜 만한 범위에 든다.
     */
    val minFemaleRatio: Double,
    /** "활성"의 기준 — 최근 며칠 안에 접속했는가(accounts.last_seen_at). */
    val activeDays: Int,
) {
    init {
        require(minFemaleRatio > 0.0) { "성비 기준은 0보다 커야 해요" }
        require(activeDays > 0) { "활성 기준 일수는 1 이상이어야 해요" }
    }

    /** 이 성별이 게이트에 걸리는가 — 켜져 있고 남성일 때만. 여성은 영향이 없다. */
    fun gates(gender: Gender): Boolean = enabled && gender == Gender.MALE

    /**
     * 지금 들일 수 있는 남성 수.
     *
     * 기준 비율을 지키면서 남성이 최대 몇 명까지 있을 수 있는지(`floor(활성여성 / 기준)`)에서
     * 이미 활성인 남성을 뺀 값. 활성 비율이 기준에 못 미치면 0 — 이미 기울어진 상태에서
     * 더 들이지 않는다. 음수는 없다.
     */
    fun admittable(activeFemale: Int, activeMale: Int): Int {
        if (!enabled) return 0
        // 비율이 이미 기준 아래면 capacity < activeMale 이라 저절로 0이 된다.
        val capacity = floor(activeFemale / minFemaleRatio).toInt()
        return (capacity - activeMale).coerceAtLeast(0)
    }
}
