package com.prologue.backend.member.application.service

import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 프로필 사진 업로드 유스케이스.
 * 저장소에 업로드([PhotoStorage]) → 반환된 공개 URL을 회원 프로필에 반영.
 */
@Service
class MemberPhotoService(
    private val memberRepository: MemberRepository,
    private val photoStorage: PhotoStorage,
) {
    @Transactional
    fun uploadPhoto(accountId: UUID, bytes: ByteArray, contentType: String): Member {
        val member = memberRepository.findByAccountId(accountId) ?: throw MemberNotOnboardedException()
        val url = photoStorage.uploadProfilePhoto(accountId, bytes, contentType)
        member.updatePhoto(url)
        return memberRepository.save(member)
    }
}
