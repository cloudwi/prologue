package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 온보딩 유스케이스: 프로필을 생성하거나(최초) 수정한다(upsert).
 */
@Service
class OnboardingService(
    private val memberRepository: MemberRepository,
) {
    @Transactional
    fun complete(command: CompleteOnboardingCommand): Member {
        val existing = memberRepository.findByAccountId(command.accountId)
        val member = if (existing != null) {
            existing.apply {
                updateProfile(
                    nickname = command.nickname,
                    gender = command.gender,
                    birthYear = command.birthYear,
                    preferredGender = command.preferredGender,
                    region = command.region,
                )
            }
        } else {
            Member.register(
                accountId = command.accountId,
                nickname = command.nickname,
                gender = command.gender,
                birthYear = command.birthYear,
                preferredGender = command.preferredGender,
                region = command.region,
            )
        }
        return memberRepository.save(member)
    }
}
