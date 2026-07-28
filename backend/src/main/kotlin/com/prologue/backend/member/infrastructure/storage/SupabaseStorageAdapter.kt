package com.prologue.backend.member.infrastructure.storage

import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.application.port.PhotoUploadException
import com.prologue.backend.member.application.port.StorageNotConfiguredException
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientResponseException
import java.util.UUID

/**
 * Supabase Storage HTTP API 기반 [PhotoStorage] 구현.
 *
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_KEY, (선택)SUPABASE_STORAGE_BUCKET(기본 profile-photos).
 * 버킷은 **public**이어야 반환 URL로 바로 조회된다. 사진마다 `{accountId}/{uuid}` 고유 경로에 저장한다.
 *
 * 인증 헤더는 `apikey`와 `Authorization: Bearer`를 **같은 값으로 함께** 보낸다.
 * 새 형식 시크릿 키(`sb_secret_…`)는 JWT가 아니라서, apikey 없이 Bearer로만 보내면
 * Storage가 JWT로 파싱하려다 403 "Invalid Compact JWS"로 거절한다
 * (문서상 두 헤더 값이 정확히 같을 때만 Bearer 사용이 허용된다).
 * legacy service_role JWT도 이 조합으로 그대로 동작한다.
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
        val path = "$accountId/${UUID.randomUUID()}" // 사진마다 고유 경로 — 삭제·캐시 문제 없음
        try {
            client.post()
                .uri("$base/storage/v1/object/$bucket/$path")
                .header("apikey", serviceKey)
                .header("Authorization", "Bearer $serviceKey")
                .contentType(MediaType.parseMediaType(contentType))
                .body(bytes)
                .retrieve()
                .toBodilessEntity()
        } catch (e: RestClientResponseException) {
            throw PhotoUploadException("Supabase Storage ${e.statusCode.value()}: ${e.responseBodyAsString}")
        }
        return "$base/storage/v1/object/public/$bucket/$path"
    }

    override fun deleteProfilePhoto(url: String) {
        if (supabaseUrl.isBlank() || serviceKey.isBlank()) return
        val base = supabaseUrl.trimEnd('/')
        val publicPrefix = "$base/storage/v1/object/public/$bucket/"
        val path = url.substringBefore('?').removePrefix(publicPrefix)
        if (path == url.substringBefore('?')) return // 이 저장소의 URL이 아니면 무시
        try {
            client.delete()
                .uri("$base/storage/v1/object/$bucket/$path")
                .header("apikey", serviceKey)
                .header("Authorization", "Bearer $serviceKey")
                .retrieve()
                .toBodilessEntity()
        } catch (_: RestClientResponseException) {
            // 삭제는 베스트 에포트 — 고아 파일이 남아도 회원 데이터 정합성에는 문제없다
        }
    }
}
