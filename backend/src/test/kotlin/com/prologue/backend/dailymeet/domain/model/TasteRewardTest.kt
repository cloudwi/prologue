package com.prologue.backend.dailymeet.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TasteRewardTest {

    @Test
    fun `정해진 장수에서만 잉크가 고인다`() {
        assertEquals(2, TasteReward.of(10))
        assertEquals(10, TasteReward.of(100))
        assertNull(TasteReward.of(11))
        assertNull(TasteReward.of(1))
    }

    @Test
    fun `평생 받을 수 있는 총량은 편지 한 통보다 가볍다`() {
        // 파밍이 성립하지 않는 근거가 이 한 줄이다 — 카드를 다 넘겨도 편지 한 통을 못 산다.
        assertTrue(TasteReward.TOTAL < InkPrice.MAIL)
    }

    @Test
    fun `이정표마다 사유가 다르다`() {
        // 사유가 같으면 "이미 받았나"를 이정표별로 가릴 수 없어 두 번째 이정표가 막힌다.
        assertEquals("TASTE_10", TasteReward.reasonOf(10))
        assertEquals("TASTE_30", TasteReward.reasonOf(30))
        assertTrue(TasteReward.reasonOf(100).length <= 30) // 원장 reason 컬럼 길이
    }
}
