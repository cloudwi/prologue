package com.prologue.backend.dailymeet.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TasteRewardTest {

    @Test
    fun `정해진 장수에서만 소개가 한 명 늘어난다`() {
        assertEquals(10, TasteReward.milestoneAt(10))
        assertEquals(100, TasteReward.milestoneAt(100))
        assertNull(TasteReward.milestoneAt(11))
        assertNull(TasteReward.milestoneAt(1))
    }

    @Test
    fun `평생 받을 수 있는 추가 소개는 네 번뿐이다`() {
        // 파밍이 성립하지 않는 근거가 이 유한함이다 — 카드를 다 넘겨도 네 번이 끝이다.
        assertEquals(4, TasteReward.TOTAL)
    }
}
