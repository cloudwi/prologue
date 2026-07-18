package com.prologue.backend.member.application.service

import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 프로필 사진 관리 유스케이스 (최대 6장).
 * 저장소에 업로드([PhotoStorage]) → 반환된 공개 URL을 회원 사진 목록에 반영.
 */
@Service
class MemberPhotoService(
    private val memberRepository: MemberRepository,
    private val photoStorage: PhotoStorage,
) {
    /** 사진 한 장 추가. 이미 6장이면 도메인에서 예외. */
    @Transactional
    fun addPhoto(accountId: UUID, bytes: ByteArray, contentType: String): Member {
        val member = memberRepository.findByAccountId(accountId) ?: throw MemberNotOnboardedException()
        if (member.photoUrls.size >= Member.MAX_PHOTOS) {
            throw MemberDomainException("사진은 최대 ${Member.MAX_PHOTOS}장까지 등록할 수 있어요")
        }
        val url = photoStorage.uploadProfilePhoto(accountId, bytes, contentType)
        member.addPhoto(url)
        return memberRepository.save(member)
    }

    /** 사진 삭제(목록에서 제거 + 저장소 베스트 에포트 삭제). */
    @Transactional
    fun removePhoto(accountId: UUID, url: String): Member {
        val member = memberRepository.findByAccountId(accountId) ?: throw MemberNotOnboardedException()
        member.removePhoto(url)
        photoStorage.deleteProfilePhoto(url)
        return memberRepository.save(member)
    }
}
