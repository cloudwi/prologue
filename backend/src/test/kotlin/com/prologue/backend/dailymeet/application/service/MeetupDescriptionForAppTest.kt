package com.prologue.backend.dailymeet.application.service

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull

/**
 * 앱에 내려보내는 소개 글 — 강제 업데이트를 하지 않기 위한 그물.
 *
 * 콘솔의 편집기를 바꾸면 저장되는 표시의 모양이 자란다. 그때 깨지는 것은 웹이 아니라
 * **지금 스토어에 있는 앱**이다. 앱은 표시를 모르므로 걷어내지 않으면 글자로 남는다.
 * 이 테스트가 통과하는 한 편집기는 앱을 건드리지 않고 바뀔 수 있다.
 */
class MeetupDescriptionForAppTest {
    @Test
    fun `사진 표시를 걷어낸다 — 사진이 있던 줄은 빈 줄로 남는다`() {
        // 표시만 지우므로 양옆 줄바꿈은 남는다. 문단 사이가 한 줄 벌어지는 편이,
        // 붙어버려 두 문단이 한 덩어리로 읽히는 것보다 낫다.
        assertEquals("첫 문단\n\n둘째 문단", stripPhotoTokens("첫 문단\n[사진1]\n둘째 문단"))
    }

    @Test
    fun `폭이 붙은 표시도 걷어낸다 — 여기가 새면 옛 앱 화면에 대괄호가 남는다`() {
        val out = stripPhotoTokens("첫 문단\n[사진1:50]\n둘째 문단\n[사진2:25]")

        assertEquals("첫 문단\n\n둘째 문단", out)
        assertFalse(out!!.contains("["))
    }

    @Test
    fun `가운데 정렬 표시도 걷어낸다 — 글자는 남기고 표시만 뗀다`() {
        assertEquals("상은 이렇게 차려 둘게요\n와인과 치즈를 준비해요", stripPhotoTokens("[가운데]상은 이렇게 차려 둘게요\n와인과 치즈를 준비해요"))
    }

    @Test
    fun `오른쪽 정렬 표시도 걷어낸다`() {
        assertEquals("— 프롤로그 드림", stripPhotoTokens("[오른쪽]— 프롤로그 드림"))
    }

    @Test
    fun `표시만 있는 글은 빈 글이 된다`() {
        assertNull(stripPhotoTokens("[사진1]\n[사진2:75]"))
    }

    @Test
    fun `표시를 걷어내다 생긴 빈 줄이 겹치지 않는다`() {
        assertEquals("앞\n\n뒤", stripPhotoTokens("앞\n\n[사진1:100]\n\n뒤"))
    }

    @Test
    fun `표시를 닮았을 뿐인 글자는 남는다 — 사람이 쓴 말을 지우면 안 된다`() {
        assertEquals("[사진]과 [사진 1] 이야기", stripPhotoTokens("[사진]과 [사진 1] 이야기"))
    }

    /*
     * 표시에 원본 크기가 붙어도 앱은 그것을 몰라야 한다.
     *
     * 문법이 자랄 때마다 여기가 같이 자라지 않으면, 새 모양이 앱 화면에 "[사진1:100:1200x1115]"
     * 라는 글자로 샌다. 스토어에 이미 나간 판은 고칠 수 없으므로 서버가 막는 수밖에 없다.
     */
    @Test
    fun `원본 크기가 붙은 표시도 걷어낸다`() {
        assertEquals("앞\n\n뒤", stripPhotoTokens("앞\n[사진1:100:1200x1115]\n뒤"))
    }

    @Test
    fun `크기만 붙어도 걷어낸다`() {
        assertNull(stripPhotoTokens("[사진1:50:800x600]"))
    }
}
