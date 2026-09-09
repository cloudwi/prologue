package com.prologue.backend.dailymeet.application.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import java.util.Base64
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * 피드용 프로필 사진 주소.
 *
 * 원본 URL을 앱에 내려 화면에서만 흐리면 개발자 도구나 네트워크 기록에서 원본을 꺼낼 수 있다.
 * 아직 열지 않은 프로필은 서버가 24×30 픽셀로 먼저 줄인 바이트만 내려서, 잉크로 열기 전에는
 * 원본을 복원할 수 없게 한다. 이미 잉크를 쓴 프로필은 가릴 이유가 없으므로 선명한 주소를 준다.
 * 4:5 비율을 유지해 작은 피드 사진에서도 인물이 옆으로 눌려 보이지 않는다.
 */
@Service
class FeedPhotoPreviewService(
    @param:Value("\${supabase.storage.url:}") private val supabaseUrl: String,
    @param:Value("\${supabase.storage.bucket:profile-photos}") private val bucket: String,
    restClientBuilder: RestClient.Builder,
) {
    private val client = restClientBuilder.build()
    private val cache = ConcurrentHashMap<String, String>()

    fun previewDataUri(originalUrl: String?): String? {
        if (originalUrl.isNullOrBlank()) return null
        cache[originalUrl]?.let { return it }
        val previewUrl = previewUrl(originalUrl, supabaseUrl, bucket) ?: return null
        return runCatching {
            val response = client.get()
                .uri(previewUrl)
                .accept(MediaType.IMAGE_JPEG)
                .retrieve()
                .toEntity(ByteArray::class.java)
            val bytes = response.body ?: return null
            val type = response.headers.contentType?.toString() ?: MediaType.IMAGE_JPEG_VALUE
            "data:$type;base64,${Base64.getEncoder().encodeToString(bytes)}"
                .also { cache[originalUrl] = it }
        }.onFailure { log.debug("피드 사진 미리보기를 만들지 못함", it) }.getOrNull()
    }

    /** 캐시에 없는 사진도 함께 요청해 피드 첫 진입이 사진 수만큼 직렬로 느려지지 않게 한다. */
    fun previewDataUris(originalUrls: Collection<String>): Map<String, String> {
        val urls = originalUrls.distinct()
        if (urls.isEmpty()) return emptyMap()
        Executors.newVirtualThreadPerTaskExecutor().use { executor ->
            return urls.associateWith { url -> executor.submit<String?> { previewDataUri(url) } }
                .mapNotNull { (url, future) -> future.get()?.let { url to it } }
                .toMap()
        }
    }

    /**
     * 잉크로 연 프로필의 사진 주소.
     *
     * 값을 치른 사람에게까지 흐린 사진을 보여줄 이유는 없다. 다만 피드 아바타는 40×50이라
     * 원본을 통째로 내리면 낭비여서 같은 렌더 엔드포인트로 줄인 주소를 준다.
     * 스토리지 주소 규칙에 맞지 않으면(외부 사진 등) 원본 주소로 물러난다.
     */
    fun unlockedPhotoUrl(originalUrl: String?): String? {
        if (originalUrl.isNullOrBlank()) return null
        return renderUrl(originalUrl, supabaseUrl, bucket, UNLOCKED_WIDTH, UNLOCKED_HEIGHT, UNLOCKED_QUALITY)
            ?: originalUrl
    }

    companion object {
        private val log = LoggerFactory.getLogger(FeedPhotoPreviewService::class.java)

        private const val PREVIEW_WIDTH = 24
        private const val PREVIEW_HEIGHT = 30
        private const val PREVIEW_QUALITY = 25
        private const val UNLOCKED_WIDTH = 120
        private const val UNLOCKED_HEIGHT = 150
        private const val UNLOCKED_QUALITY = 70

        internal fun previewUrl(originalUrl: String, supabaseUrl: String, bucket: String): String? =
            renderUrl(originalUrl, supabaseUrl, bucket, PREVIEW_WIDTH, PREVIEW_HEIGHT, PREVIEW_QUALITY)

        internal fun unlockedUrl(originalUrl: String, supabaseUrl: String, bucket: String): String? =
            renderUrl(originalUrl, supabaseUrl, bucket, UNLOCKED_WIDTH, UNLOCKED_HEIGHT, UNLOCKED_QUALITY)

        private fun renderUrl(
            originalUrl: String,
            supabaseUrl: String,
            bucket: String,
            width: Int,
            height: Int,
            quality: Int,
        ): String? {
            if (supabaseUrl.isBlank()) return null
            val base = supabaseUrl.trimEnd('/')
            val originalPrefix = "$base/storage/v1/object/public/$bucket/"
            if (!originalUrl.startsWith(originalPrefix) || originalUrl.contains('?')) return null
            val renderPrefix = "$base/storage/v1/render/image/public/$bucket/"
            return originalUrl.replaceFirst(originalPrefix, renderPrefix) +
                "?width=$width&height=$height&resize=cover&quality=$quality"
        }
    }
}
