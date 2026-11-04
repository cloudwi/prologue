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

    @Test
    fun `이미지 서버가 응답하지 않아도 피드 사진 대기는 제한 시간 뒤 끝난다`() = checkTimeout(false)

    @Test
    fun `이미지 본문 전송이 멈춰도 제한 시간 뒤 미리보기를 생략한다`() = checkTimeout(true)

    private fun checkTimeout(partialBody: Boolean) {
        val release = java.util.concurrent.CountDownLatch(1)
        val server = com.sun.net.httpserver.HttpServer.create(java.net.InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            if (partialBody) {
                exchange.sendResponseHeaders(200, 2)
                exchange.responseBody.write(1)
                exchange.responseBody.flush()
            }
            release.await(6, java.util.concurrent.TimeUnit.SECONDS)
            runCatching {
                if (!partialBody) exchange.sendResponseHeaders(200, 1)
                exchange.responseBody.use { it.write(1) }
            }
            exchange.close()
        }
        server.start()
        try {
            val url = "http://127.0.0.1:${server.address.port}"
            val service = FeedPhotoPreviewService(url, "profile-photos", org.springframework.web.client.RestClient.builder())
            val start = System.nanoTime()
            assertEquals(emptyMap(), service.previewDataUris(listOf("$url/storage/v1/object/public/profile-photos/synthetic/photo")))
            kotlin.test.assertTrue(java.time.Duration.ofNanos(System.nanoTime() - start).toMillis() < 5000)
        } finally {
            release.countDown()
            server.stop(0)
        }
    }
}
