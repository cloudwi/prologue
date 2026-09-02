package com.prologue.backend.dailymeet.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class TasteAffinityTest {

    private fun choices(vararg pairs: Pair<Long, TasteOption>) = mapOf(*pairs)

    @Test
    fun `둘 다 답한 카드가 세 장에 못 미치면 판단하지 않는다`() {
        // 한두 장 겹친 걸로 "취향이 같다"고 하면 두 장 넘긴 사람이 백 장 넘긴 사람을 앞지른다.
        val mine = choices(1L to TasteOption.A, 2L to TasteOption.A)
        val theirs = choices(1L to TasteOption.A, 2L to TasteOption.A)

        assertEquals(0.0, TasteAffinity.overlap(mine, theirs))
    }

    @Test
    fun `모두 같은 선택이면 만점`() {
        val mine = choices(1L to TasteOption.A, 2L to TasteOption.B, 3L to TasteOption.A)

        assertEquals(1.0, TasteAffinity.overlap(mine, mine))
    }

    @Test
    fun `절반만 겹치는 건 우연이라 0점이다`() {
        // 선택지가 둘뿐이라 아무 두 사람이나 절반은 겹친다 — 그걸 점수로 주면 순위를 가르지 못한다.
        val mine = choices(1L to TasteOption.A, 2L to TasteOption.A, 3L to TasteOption.A, 4L to TasteOption.A)
        val theirs = choices(1L to TasteOption.A, 2L to TasteOption.A, 3L to TasteOption.B, 4L to TasteOption.B)

        assertEquals(0.0, TasteAffinity.overlap(mine, theirs))
    }

    @Test
    fun `절반을 넘어선 만큼만 점수가 된다`() {
        val mine = choices(1L to TasteOption.A, 2L to TasteOption.A, 3L to TasteOption.A, 4L to TasteOption.A)
        val threeOfFour = choices(1L to TasteOption.A, 2L to TasteOption.A, 3L to TasteOption.A, 4L to TasteOption.B)

        assertEquals(0.5, TasteAffinity.overlap(mine, threeOfFour))
    }

    @Test
    fun `모두 어긋나도 음수가 되지 않는다`() {
        val mine = choices(1L to TasteOption.A, 2L to TasteOption.A, 3L to TasteOption.A)
        val opposite = choices(1L to TasteOption.B, 2L to TasteOption.B, 3L to TasteOption.B)

        assertEquals(0.0, TasteAffinity.overlap(mine, opposite))
    }

    @Test
    fun `상대가 안 넘긴 카드는 어긋난 게 아니라 모르는 것이다`() {
        // 겹치는 3장은 모두 같고, 상대가 답하지 않은 카드가 스무 장 있어도 만점이어야 한다.
        val mine = (1L..23L).associateWith { TasteOption.A }
        val theirs = choices(1L to TasteOption.A, 2L to TasteOption.A, 3L to TasteOption.A)

        assertEquals(1.0, TasteAffinity.overlap(mine, theirs))
    }

    @Test
    fun `한쪽이 아무 카드도 안 넘겼으면 0점`() {
        assertEquals(0.0, TasteAffinity.overlap(emptyMap(), choices(1L to TasteOption.A)))
    }

    @Test
    fun `똑같이 고른 카드만 목록에 남는다`() {
        val mine = choices(1L to TasteOption.A, 2L to TasteOption.B, 3L to TasteOption.A)
        val theirs = choices(1L to TasteOption.A, 2L to TasteOption.A, 4L to TasteOption.A)

        assertEquals(listOf(1L), TasteAffinity.agreedCardIds(mine, theirs))
    }

    @Test
    fun `취향이 겹치면 매칭 점수가 오른다`() {
        // 점수에 실리지 않으면 카드는 그냥 놀이다 — 겹침이 실제로 순서를 바꾸는지 여기서 고정한다.
        val me = com.prologue.backend.member.domain.model.Member.register(
            accountId = java.util.UUID.randomUUID(),
            nickname = "나",
            gender = com.prologue.backend.member.domain.model.Gender.FEMALE,
            birthDate = java.time.LocalDate.of(1996, 5, 14),
            preferredGender = com.prologue.backend.member.domain.model.Gender.MALE,
            region = "서울 성동구",
            phone = "01012345678",
        )

        val withTaste = PeerScore.of(me, me, exposureCount = 0, tasteOverlap = 1.0)
        val without = PeerScore.of(me, me, exposureCount = 0, tasteOverlap = 0.0)

        assertTrue(withTaste > without)
    }
}
