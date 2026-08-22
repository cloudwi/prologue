package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.member.application.port.PhotoInspector
import com.prologue.backend.member.application.port.PhotoRejectedException
import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.domain.model.ImageFormat
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * 모임 커버 사진 업로드.
 *
 * 프로필 사진의 저장소·검수기를 그대로 빌려 쓰되 정책이 다르다 —
 * 커버는 음식·장소 사진이 보통이라 얼굴을 요구하지 않고, 선정성(unsafe)만 거른다.
 * 모임 생성 전에 올리고 URL을 받아 생성 요청에 싣는다.
 */
@Service
class MeetupCoverService(
    private val photoStorage: PhotoStorage,
    private val photoInspector: PhotoInspector,
) {
    fun upload(accountId: UUID, bytes: ByteArray): String {
        val format = ImageFormat.detect(bytes)
        if (!format.supported) {
            throw DailyMeetException(
                when (format) {
                    ImageFormat.HEIC ->
                        "아이폰 HEIC 형식이라 올릴 수 없어요. 설정 > 카메라 > 포맷을 '높은 호환성'으로 바꾸거나 다른 사진을 골라주세요"
                    else -> "jpg, png, webp 이미지만 올릴 수 있어요"
                },
            )
        }
        val inspection = photoInspector.inspect(bytes, format.mimeType)
        if (!inspection.skipped && inspection.unsafe) {
            throw PhotoRejectedException("선정적이거나 부적절한 사진은 커버로 쓸 수 없어요")
        }
        return photoStorage.uploadProfilePhoto(accountId, bytes, format.mimeType)
    }
}
