package com.prologue.backend.dailymeet.domain.model

/**
 * 취향 카드를 넘긴 보람 — 정해진 장수를 넘길 때마다 한 번씩 고이는 잉크.
 *
 * 카드는 원래 아무것도 주지 않았다. 겹치는 취향이 소개 순서를 바꾸긴 하지만 그건 뒤에서 조용히
 * 일어나는 일이라, 넘기는 사람 손에는 아무것도 남지 않았다(유저 지적 2026-09-02).
 *
 * **장당 보상은 두지 않는다.** 탭 한 번에 잉크가 붙으면 그게 이 앱에서 가장 값싼 잉크가 되고,
 * 글을 쓰는 일([InkPrice.DAILY_ANSWER])이 바보짓이 된다. 대신 **한 계정에 한 번뿐인 이정표**로
 * 둔다 — 총량이 [TOTAL]로 묶여 있어 파밍이 성립하지 않고, 그러면서도 넘기다 보면 예고 없이
 * 한 번씩 툭 떨어져 "이걸 왜 하고 있지"에 답이 된다.
 *
 * 장수를 화면에 보여주지 않는 것도 같은 판단이다(유저 결정 2026-09-02) — 진도표가 되면
 * 채워야 할 목록이 하나 더 생긴다. 세는 건 서버만 하고, 사람은 가끔 받기만 한다.
 */
object TasteReward {

    /** 넘긴 장수 → 그때 한 번 고이는 잉크. */
    private val MILESTONES: Map<Int, Int> = mapOf(
        10 to 2,
        30 to 3,
        60 to 5,
        100 to 10,
    )

    /** 이 표로 한 사람이 평생 받을 수 있는 최대치 — 편지 한 통(50)의 절반도 되지 않는다. */
    val TOTAL: Int = MILESTONES.values.sum()

    /** [answeredCount]장째에 주어질 잉크. 이정표가 아니면 null. */
    fun of(answeredCount: Int): Int? = MILESTONES[answeredCount]

    /** 원장에 남길 사유 — 이정표마다 달라야 "이미 받았나"를 사유 하나로 판정할 수 있다. */
    fun reasonOf(answeredCount: Int): String = "TASTE_$answeredCount"
}
