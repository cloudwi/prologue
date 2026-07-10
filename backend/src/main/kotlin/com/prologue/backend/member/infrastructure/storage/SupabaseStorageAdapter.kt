package com.prologue.backend.member.infrastructure.storage

import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.application.port.PhotoUploadException
import com.prologue.backend.member.application.port.StorageNotConfiguredException
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientResponseException
import java.time.Instant
import java.util.UUID

/**
 * Supabase Storage HTTP API 기반 [PhotoStorage] 구현.
 *
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_KEY, (선택)SUPABASE_STORAGE_BUCKET(기본 profile-photos).
 * 버킷은 **public**이어야 반환 URL로 바로 조회된다. 경로는 `{accountId}/profile` 고정 + x-upsert로 덮어쓰기.
 */
@Component
class SupabaseStorageAdapter(
    @param:Value("\${supabase.storage.url:}") private val supabaseUrl: String,
    @param:Value("\${supabase.storage.service-key:}") private val serviceKey: String,
    @param:Value("\${supabase.storage.bucket:profile-photos}") private val bucket: String,
    restClientBuilder: RestClient.Builder,
) : PhotoStorage {

    private val client = restClientBuilder.build()

    override fun uploadProfilePhoto(accountId: UUID, bytes: ByteArray, contentType: String): String {
        if (supabaseUrl.isBlank() || serviceKey.isBlank()) throw StorageNotConfiguredException()

        val base = supabaseUrl.trimEnd('/')
        val path = "$accountId/profile"
        try {
            client.post()
                .uri("$base/storage/v1/object/$bucket/$path")
                .header("Authorization", "Bearer $serviceKey")
                .header("x-upsert", "true") // 재업로드 시 덮어쓰기
                .contentType(MediaType.parseMediaType(contentType))
                .body(bytes)
                .retrieve()
                .toBodilessEntity()
        } catch (e: RestClientResponseException) {
            throw PhotoUploadException("Supabase Storage ${e.statusCode.value()}: ${e.responseBodyAsString}")
        }
        // 공개 URL + 캐시버스터(업로드마다 URL이 바뀌어 옛 이미지 캐시 방지)
        return "$base/storage/v1/object/public/$bucket/$path?v=${Instant.now().toEpochMilli()}"
    }
}
