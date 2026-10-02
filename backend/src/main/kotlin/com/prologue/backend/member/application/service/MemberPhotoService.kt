package com.prologue.backend.member.application.service

import com.prologue.backend.member.application.port.PhotoInspection
import com.prologue.backend.member.application.port.PhotoInspector
import com.prologue.backend.member.application.port.PhotoRejectedException
import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.domain.model.ImageFormat
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.repository.MemberRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 프로필 사진 관리 유스케이스 (최대 6장).
 * 검수([PhotoInspector])를 통과한 사진만 저장소에 업로드([PhotoStorage])하고, 반환된 공개 URL을 회원 사진 목록에 반영.
 */
@Service
class MemberPhotoService(
    private val memberRepository: MemberRepository,
    private val photoStorage: PhotoStorage,
    private val photoInspector: PhotoInspector,
) {
    /**
     * 사진 한 장 추가. 이미 6장이면 도메인에서 예외. 얼굴이 없거나 부적절하면 [PhotoRejectedException].
     *
     * 형식은 요청의 Content-Type이 아니라 바이트에서 직접 판별한다([ImageFormat]).
     */
    @Transactional
    fun addPhoto(accountId: UUID, bytes: ByteArray): PhotoUploadResult {
        val member = memberRepository.findByAccountId(accountId) ?: throw MemberNotOnboardedException()
        if (member.photoUrls.size >= Member.MAX_PHOTOS) {
            throw MemberDomainException("사진은 최대 ${Member.MAX_PHOTOS}장까지 등록할 수 있어요")
        }
        val format = requireSupportedFormat(bytes)
        // 저장소에 올리기 전에 판정한다 — 거절된 사진이 스토리지에 고아로 남지 않는다.
        // 대표 사진만 얼굴을 확인한다. 크기·검수 불가는 가입을 막지 않는 안내로 돌린다.
        val notice = inspectProfilePhoto(photoInspector.inspect(bytes, format.mimeType), member.photoUrls.size)
        val url = photoStorage.uploadProfilePhoto(accountId, bytes, format.mimeType)
        member.addPhoto(url)
        return PhotoUploadResult(memberRepository.save(member), notice)
    }

    /** 실제 바이트로 형식을 확인한다. HEIC는 원인을 짚어 안내한다 — 아이폰 기본 설정이라 자주 마주친다. */
    private fun requireSupportedFormat(bytes: ByteArray): ImageFormat {
        val format = ImageFormat.detect(bytes)
        if (format.supported) return format
        throw MemberDomainException(
            when (format) {
                ImageFormat.HEIC ->
                    "아이폰 HEIC 형식이라 등록할 수 없어요. 설정 > 카메라 > 포맷을 '높은 호환성'으로 바꾸거나 다른 사진을 골라주세요"
                else -> "jpg, png, webp 이미지만 등록할 수 있어요"
            },
        )
    }

    /** 사진 삭제(본인). 최소 장수 밑으로는 도메인이 막는다. 통과하면 저장소도 베스트 에포트로 지운다. */
    @Transactional
    fun removePhoto(accountId: UUID, url: String): Member {
        val member = memberRepository.findByAccountId(accountId) ?: throw MemberNotOnboardedException()
        member.removePhoto(url)
        photoStorage.deleteProfilePhoto(url)
        return memberRepository.save(member)
    }

    /** 검수 삭제(운영자). 부적절 사진은 최소 장수와 무관하게 내린다. */
    @Transactional
    fun stripPhoto(accountId: UUID, url: String): Member {
        val member = memberRepository.findByAccountId(accountId) ?: throw MemberNotOnboardedException()
        member.stripPhoto(url)
        photoStorage.deleteProfilePhoto(url)
        return memberRepository.save(member)
    }

    /**
     * 첫 사진은 얼굴 유무만 확인하고, 두 번째부터는 취향 사진도 받는다.
     * 작은 얼굴·검수 불가는 거절이 아닌 권장 안내. 부적절 이미지 차단은 모든 자리에 적용한다.
     */
    private fun inspectProfilePhoto(inspection: PhotoInspection, position: Int): String? {
        if (inspection.unsafe) {
            throw PhotoRejectedException("선정적이거나 부적절한 사진은 등록할 수 없어요")
        }
        if (position >= FACE_REQUIRED_UNTIL) return null
        if (inspection.skipped) {
            return "사진을 등록했어요. 얼굴을 자동으로 확인하지 못했지만, 얼굴이 보이는 대표 사진이면 괜찮아요."
        }
        if (inspection.faceCount == 0) {
            log.info("대표 사진 거절(얼굴을 확인하지 못함)")
            throw PhotoRejectedException("첫 번째 사진에서 얼굴을 확인하지 못했어요. 얼굴이 보이는 사진 한 장을 골라주세요. 두 번째부터는 자유롭게 올릴 수 있어요")
        }
        val ratio = inspection.largestFaceRatio
        if (ratio != null && ratio < RECOMMENDED_FACE_AREA_RATIO) {
            return "사진을 등록했어요. 얼굴이 작게 나왔지만 그대로 사용할 수 있어요. 조금 더 가까운 사진이면 알아보기 좋아요."
        }
        return null
    }

    companion object {
        private val log = LoggerFactory.getLogger(MemberPhotoService::class.java)

        /** 첫 번째로 업로드되는 대표 사진만 얼굴을 요구한다. */
        const val FACE_REQUIRED_UNTIL = 1

        /**
         * 알아보기 좋은 얼굴 크기의 권장 기준(2%). 미달해도 업로드·가입을 막지 않는다.
         */
        const val RECOMMENDED_FACE_AREA_RATIO = 0.02
    }
}

/** 업로드는 이미 성공했다. notice는 다시 제출할 필요가 없는 비차단 안내다. */
data class PhotoUploadResult(val member: Member, val notice: String? = null)
