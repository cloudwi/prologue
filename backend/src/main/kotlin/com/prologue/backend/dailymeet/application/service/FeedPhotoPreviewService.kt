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
 * 피드용 프로필 사진 미리보기.
 *
 * 원본 URL을 앱에 내려 화면에서만 흐리면 개발자 도구나 네트워크 기록에서 원본을 꺼낼 수 있다.
 * 서버가 12×15 픽셀로 먼저 줄인 바이트만 내려서, 잉크로 열기 전에는 원본을 복원할 수 없게 한다.
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

    companion object {
        private val log = LoggerFactory.getLogger(FeedPhotoPreviewService::class.java)

        internal fun previewUrl(originalUrl: String, supabaseUrl: String, bucket: String): String? {
            if (supabaseUrl.isBlank()) return null
            val base = supabaseUrl.trimEnd('/')
            val originalPrefix = "$base/storage/v1/object/public/$bucket/"
            if (!originalUrl.startsWith(originalPrefix) || originalUrl.contains('?')) return null
            val renderPrefix = "$base/storage/v1/render/image/public/$bucket/"
            return originalUrl.replaceFirst(originalPrefix, renderPrefix) +
                "?width=12&height=15&resize=cover&quality=20"
        }
    }
}
