package com.prologue.backend.dailymeet.domain.model

/**
 * 취향 카드를 넘긴 보람 — 정해진 장수를 넘길 때마다 **오늘의 상대가 한 명 더 도착한다**.
 *
 * 처음엔 잉크로 줬다가 사람으로 바꿨다(유저 결정 2026-09-02). 이 앱에서 보상은 재화가 아니라
 * 사람이어야 한다 — 잉크는 결국 사람을 만나기 위해 쓰는 것이고, 카드가 하는 일도 "누구를
 * 만날지 더 잘 고르는 것"이라 보상과 행동이 같은 방향을 가리킨다. 잉크로 주면 카드가 재화를
 * 캐는 자리가 되고, 그러면 값싼 잉크가 글의 값어치까지 함께 끌어내린다.
 *
 * **장당 보상은 없다.** 한 계정에 한 번뿐인 이정표 넷이라 총 네 번, 그 이상은 없다.
 * 파밍이 성립하지 않는 근거가 그 유한함이다.
 *
 * 예고하지 않는다 — 다음 이정표까지 몇 장 남았다고 적으면 그게 진도표가 된다.
 * 세는 건 서버만 하고, 사람은 가끔 받기만 한다.
 */
object TasteReward {

    /** 이 장수에 이르면 상대 한 명이 더 온다. */
    private val MILESTONES: List<Int> = listOf(10, 30, 60, 100)

    /** [answeredCount]장째가 이정표인가 — 맞으면 그 이정표 값, 아니면 null. */
    fun milestoneAt(answeredCount: Int): Int? = MILESTONES.firstOrNull { it == answeredCount }

    /** 한 사람이 평생 받을 수 있는 추가 소개 횟수. */
    val TOTAL: Int = MILESTONES.size
}
