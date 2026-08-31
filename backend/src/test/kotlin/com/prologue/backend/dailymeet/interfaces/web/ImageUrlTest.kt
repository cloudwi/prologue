package com.prologue.backend.dailymeet.interfaces.web

import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals

/**
 * 사진을 원본 그대로 내보내던 자리를 막아둔다.
 *
 * 이게 틀리면 **눈에 띄지 않게** 틀린다 — 사진은 멀쩡히 보이고 요금과 대기 시간만 는다.
 * 그래서 규칙을 못 박는다: 우리 저장소 사진이면 변환 주소로, 아니면 손대지 않고 그대로.
 */
class ImageUrlTest {

    private val stored =
        "https://kzuhaixfhkneyfhxrpxd.supabase.co/storage/v1/object/public/profile-photos/acc/photo"

    @Test
    fun `우리 저장소 사진은 변환 주소로 바꾼다`() {
        assertEquals(
            "https://kzuhaixfhkneyfhxrpxd.supabase.co/storage/v1/render/image/public/profile-photos/acc/photo" +
                "?width=600&resize=contain&quality=70",
            ImageUrl.thumb(stored, 600),
        )
    }

    /**
     * `resize=contain`이 빠지면 Supabase는 줄이는 대신 가운데를 세로로 오려낸다.
     * 앱이 같은 자리에서 겪은 일이라(lib/image.ts), 여기서는 사고로라도 빠지지 않게 못 박는다.
     */
    @Test
    fun `줄이기 모드가 반드시 붙는다`() {
        assertContains(ImageUrl.thumb(stored, ImageUrl.COVER), "resize=contain")
    }

    @Test
    fun `남의 주소는 손대지 않는다`() {
        val outside = "https://example.com/photo.jpg"
        assertEquals(outside, ImageUrl.thumb(outside, 600))
    }

    /** 이미 변환을 거쳤거나 서명이 붙은 주소에 물음표를 하나 더 달면 주소가 깨진다. */
    @Test
    fun `물음표가 이미 있으면 그대로 둔다`() {
        val signed = "$stored?token=abc"
        assertEquals(signed, ImageUrl.thumb(signed, 600))
    }

    @Test
    fun `폭은 화면에 보이는 크기 순서를 따른다`() {
        assert(ImageUrl.ROW < ImageUrl.INLINE)
        assert(ImageUrl.INLINE < ImageUrl.COVER)
    }
}
