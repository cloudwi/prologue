package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** 프로필 조회(읽기 전용) 유스케이스. */
@Service
class MemberQueryService(
    private val memberRepository: MemberRepository,
) {
    @Transactional(readOnly = true)
    fun findProfile(accountId: UUID): Member? = memberRepository.findByAccountId(accountId)
}
