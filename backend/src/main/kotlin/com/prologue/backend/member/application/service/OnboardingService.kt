package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberConsent
import com.prologue.backend.member.domain.repository.MemberConsentRepository
import com.prologue.backend.member.domain.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 온보딩 유스케이스: 프로필을 생성하거나(최초) 수정한다(upsert).
 * 최초 가입이면 함께 온 동의도 같은 트랜잭션에서 남긴다 — 프로필만 생기고 동의 기록이 없는 상태를 만들지 않는다.
 */
@Service
class OnboardingService(
    private val memberRepository: MemberRepository,
    private val consentRepository: MemberConsentRepository,
) {
    @Transactional
    fun complete(command: CompleteOnboardingCommand): Member {
        val existing = memberRepository.findByAccountId(command.accountId)
        if (existing == null) recordConsent(command)
        val member = if (existing != null) {
            existing.apply {
                updateProfile(
                    nickname = command.nickname,
                    gender = command.gender,
                    birthDate = command.birthDate,
                    preferredGender = command.preferredGender,
                    region = command.region,
                    phone = command.phone,
                    kakaoId = command.kakaoId,
                    bio = command.bio,
                    heightCm = command.heightCm,
                    bodyType = command.bodyType,
                    hobbies = command.hobbies,
                    interests = command.interests,
                    strengths = command.strengths,
                    avatarId = command.avatarId,
                )
            }
        } else {
            Member.register(
                accountId = command.accountId,
                nickname = command.nickname,
                gender = command.gender,
                birthDate = command.birthDate,
                preferredGender = command.preferredGender,
                region = command.region,
                phone = command.phone,
                kakaoId = command.kakaoId,
                bio = command.bio,
                heightCm = command.heightCm,
                bodyType = command.bodyType,
                hobbies = command.hobbies,
                interests = command.interests,
                strengths = command.strengths,
                avatarId = command.avatarId,
            )
        }
        return memberRepository.save(member)
    }

    /**
     * 최초 가입에 한 해 동의를 남긴다.
     *
     * 동의를 보내지 않은 요청은 통과시킨다 — 이 기능이 없던 앱 버전이 아직 유저 폰에 남아 있어서,
     * 여기서 막으면 그 앱들의 가입이 통째로 실패한다. 모든 유저가 새 버전으로 넘어간 뒤
     * (앱 최소 지원 버전을 올린 뒤) 필수로 조일 수 있다.
     */
    private fun recordConsent(command: CompleteOnboardingCommand) {
        val agreement = command.consent ?: return
        if (consentRepository.existsByAccountId(command.accountId)) return
        consentRepository.save(
            MemberConsent.record(
                accountId = command.accountId,
                legalVersion = agreement.legalVersion,
                terms = agreement.terms,
                privacy = agreement.privacy,
                age = agreement.age,
                sensitive = agreement.sensitive,
                marketing = agreement.marketing,
            ),
        )
    }
}
