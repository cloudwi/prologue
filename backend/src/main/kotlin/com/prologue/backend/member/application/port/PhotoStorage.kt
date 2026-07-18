package com.prologue.backend.member.application.port

import java.util.UUID

/**
 * 프로필 사진 저장소 아웃 포트(SPI).
 * Render가 SMTP를 막는 것과 달리 오브젝트 스토리지는 HTTPS라, Supabase Storage에 HTTP로 업로드한다.
 */
interface PhotoStorage {
    /**
     * 회원의 프로필 사진 한 장을 고유 경로에 업로드하고 공개 URL을 반환한다.
     */
    fun uploadProfilePhoto(accountId: UUID, bytes: ByteArray, contentType: String): String

    /**
     * 공개 URL로 업로드된 사진을 삭제한다. 이 저장소의 URL이 아니거나 실패해도 무시한다(베스트 에포트).
     */
    fun deleteProfilePhoto(url: String)
}

/** 저장소 환경변수(URL/service-key)가 설정되지 않음. (→ 503) */
class StorageNotConfiguredException : RuntimeException("사진 저장소가 아직 설정되지 않았습니다")

/** 저장소 업로드 호출 실패(원인 메시지 포함). (→ 502) */
class PhotoUploadException(message: String) : RuntimeException(message)
