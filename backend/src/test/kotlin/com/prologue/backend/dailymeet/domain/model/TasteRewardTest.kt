package com.prologue.backend.dailymeet.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TasteRewardTest {

    @Test
    fun `열 장마다 보상 지점이 온다`() {
        assertEquals(10, TasteReward.milestoneAt(10))
        assertEquals(20, TasteReward.milestoneAt(20))
        assertEquals(250, TasteReward.milestoneAt(250))
        assertNull(TasteReward.milestoneAt(11))
        assertNull(TasteReward.milestoneAt(1))
    }

    @Test
    fun `더미가 늘어도 규칙은 그대로 이어진다`() {
        // 끝이 있는 이정표(10·30·60·100)를 쓰다가 되풀이되는 규칙으로 바꿨다 —
        // 운영이 카드를 계속 붓기 때문에 끝을 못 박으면 오래 쓴 사람에게 남는 게 없다.
        assertEquals(1000, TasteReward.milestoneAt(1000))
    }

    @Test
    fun `한 장도 안 넘긴 상태는 보상 지점이 아니다`() {
        // 0 % 10 == 0이라 무심코 통과시키면 카드를 고르지도 않고 상대를 받는다.
        assertNull(TasteReward.milestoneAt(0))
    }
}
