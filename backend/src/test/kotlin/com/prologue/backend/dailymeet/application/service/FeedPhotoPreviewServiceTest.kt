package com.prologue.backend.dailymeet.application.service

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class FeedPhotoPreviewServiceTest {
    private val base = "https://project.supabase.co"
    private val original = "$base/storage/v1/object/public/profile-photos/account/photo"

    @Test
    fun `원본 주소를 작은 비공개 미리보기 요청으로 바꾼다`() {
        assertEquals(
            "$base/storage/v1/render/image/public/profile-photos/account/photo" +
                "?width=24&height=30&resize=cover&quality=25",
            FeedPhotoPreviewService.previewUrl(original, base, "profile-photos"),
        )
    }

    @Test
    fun `외부 사진 주소는 가져오지 않는다`() {
        assertNull(FeedPhotoPreviewService.previewUrl("https://example.com/photo.jpg", base, "profile-photos"))
    }

    @Test
    fun `연 프로필은 흐리지 않은 크기로 요청한다`() {
        assertEquals(
            "$base/storage/v1/render/image/public/profile-photos/account/photo" +
                "?width=120&height=150&resize=cover&quality=70",
            FeedPhotoPreviewService.unlockedUrl(original, base, "profile-photos"),
        )
    }

    @Test
    fun `스토리지 주소가 없으면 연 프로필 주소도 만들지 않는다`() {
        assertNull(FeedPhotoPreviewService.unlockedUrl(original, "", "profile-photos"))
    }
}
