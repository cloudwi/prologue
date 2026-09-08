package com.prologue.backend.dailymeet.domain.model

/**
 * 취향이 얼마나 겹치나 — 서술형 답으로는 낼 수 없는 점수.
 *
 * 글은 사람을 알게 하지만 계산되지 않는다. 카드는 그 반대라, [PeerScore]가 쓸 수 있는
 * 유일한 구조화된 취향 신호다.
 *
 * **둘 다 답한 카드만** 센다. 상대가 아직 안 넘긴 카드는 어긋난 것이 아니라 모르는 것이다.
 *
 * 카드별 선택지 개수로 우연히 일치할 확률을 구한다(2개: 1/2, 3개: 1/3, 4개: 1/4).
 * 함께 답한 카드의 평균 우연 일치율을 넘는 만큼을 점수로 쓴다.
 *
 * (한계: 카드마다 인기 선택지가 있어 "다들 고르는 쪽"이 겹치는 건 값이 덜하다. 사람이 쌓이면
 * 선택 분포로 희소한 일치에 무게를 더 줄 수 있다 — 지금은 데이터가 없어 단순한 쪽을 쓴다.)
 */
object TasteAffinity {

    /**
     * 겹침을 판단하기 위한 최소 표본. 한두 장 겹친 걸로 "취향이 같다"고 하면
     * 카드 두 장 넘긴 사람이 백 장 넘긴 사람을 앞지른다.
     */
    const val MIN_SHARED = 3

    /** 둘 다 답한 카드 기준, 우연 일치율을 넘어선 일치도. 0.0~1.0. */
    fun overlap(mine: Map<Long, TasteOption>, theirs: Map<Long, TasteOption>, optionCounts: Map<Long, Int> = emptyMap()): Double {
        val shared = mine.keys.intersect(theirs.keys)
        if (shared.size < MIN_SHARED) return 0.0
        val agreed = shared.count { mine[it] == theirs[it] }
        val ratio = agreed.toDouble() / shared.size
        val chance = shared.map { 1.0 / (optionCounts[it] ?: 2).coerceAtLeast(2) }.average()
        return ((ratio - chance) / (1.0 - chance)).coerceIn(0.0, 1.0)
    }

    /** 둘이 똑같이 고른 카드 id — 화면에 "둘 다 이걸 골랐어요"로 보여줄 목록. */
    fun agreedCardIds(mine: Map<Long, TasteOption>, theirs: Map<Long, TasteOption>): List<Long> =
        mine.keys.intersect(theirs.keys).filter { mine[it] == theirs[it] }.sorted()
}
