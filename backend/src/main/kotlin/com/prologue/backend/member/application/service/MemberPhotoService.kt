package com.prologue.backend.member.application.service

import com.prologue.backend.member.application.port.PhotoInspection
import com.prologue.backend.member.application.port.PhotoInspector
import com.prologue.backend.member.application.port.PhotoRejectedException
import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.domain.model.ImageFormat
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.repository.MemberRepository
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
    fun addPhoto(accountId: UUID, bytes: ByteArray): Member {
        val member = memberRepository.findByAccountId(accountId) ?: throw MemberNotOnboardedException()
        if (member.photoUrls.size >= Member.MAX_PHOTOS) {
            throw MemberDomainException("사진은 최대 ${Member.MAX_PHOTOS}장까지 등록할 수 있어요")
        }
        val format = requireSupportedFormat(bytes)
        // 저장소에 올리기 전에 판정한다 — 거절된 사진이 스토리지에 고아로 남지 않는다.
        requireUsableProfilePhoto(photoInspector.inspect(bytes, format.mimeType))
        val url = photoStorage.uploadProfilePhoto(accountId, bytes, format.mimeType)
        member.addPhoto(url)
        return memberRepository.save(member)
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
     * 프로필 사진으로 쓸 수 있는 사진인지 판단한다.
     *
     * 판별하지 못한 경우([PhotoInspection.skipped])는 통과시킨다.
     * 검수기가 죽었다고 가입이 막히는 쪽이, 얼굴 없는 사진 몇 장이 올라가는 쪽보다 나쁘다.
     */
    private fun requireUsableProfilePhoto(inspection: PhotoInspection) {
        if (inspection.skipped) return
        if (inspection.unsafe) {
            throw PhotoRejectedException("선정적이거나 부적절한 사진은 등록할 수 없어요")
        }
        if (inspection.faceCount == 0) {
            throw PhotoRejectedException("얼굴이 보이지 않아요. 얼굴이 나온 사진으로 올려주세요")
        }
        val ratio = inspection.largestFaceRatio
        if (ratio != null && ratio < MIN_FACE_AREA_RATIO) {
            throw PhotoRejectedException("얼굴이 너무 작게 나왔어요. 조금 더 가까이서 찍은 사진으로 올려주세요")
        }
    }

    companion object {
        /**
         * 가장 큰 얼굴이 사진에서 차지해야 하는 최소 넓이 비율(2%).
         * 멀리서 찍혀 얼굴이 점만 한 풍경 사진을 거르는 하한선일 뿐, 상반신·전신 사진은 넉넉히 통과한다.
         */
        const val MIN_FACE_AREA_RATIO = 0.02
    }
}
