package com.prologue.backend.member.application.service

import com.prologue.backend.growth.GrowthEvents
import com.prologue.backend.growth.GrowthEvent

import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberDomainException
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
    private val growthEvents: GrowthEvents = GrowthEvents.NONE,
    /** 성비 게이트 — 신규 남성을 줄 세운다. null은 격리된 테스트를 위한 값이고 Spring은 빈을 넣어준다. */
    private val memberGateService: MemberGateService? = null,
) {
    @Transactional
    fun complete(command: CompleteOnboardingCommand): Member {
        val existing = memberRepository.findByAccountId(command.accountId)
        recordConsent(command, isFirst = existing == null)
        val member = if (existing != null) {
            // 성별은 가입 후 바꿀 수 없다. 매칭·성비 게이트·초대 보상(여성 가중)이 전부 성별을 축으로
            // 돌아가는데, 바꿀 수 있으면 "여성으로 고쳐 보상을 받고 되돌리기"가 앱 UI만으로 된다.
            // 게이트의 "기다리는 동안" 규칙보다 넓은 규칙이라 그쪽 검사는 이 뒤에 닿지 않는다.
            if (existing.gender != command.gender) {
                throw MemberDomainException("성별은 가입 후 바꿀 수 없어요")
            }
            existing.apply {
                updateProfile(
                    nickname = command.nickname,
                    gender = command.gender,
                    birthDate = command.birthDate,
                    preferredGender = command.preferredGender,
                    minAge = command.minAge,
                    maxAge = command.maxAge,
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
                minAge = command.minAge,
                maxAge = command.maxAge,
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
        return memberRepository.save(member).also {
            if (existing == null) {
                growthEvents.record(command.accountId, GrowthEvent.ONBOARDED, "onboarding")
                // 온보딩을 마친 신규 남성만 줄을 선다 — 여성과 기존 회원은 행이 생기지 않는다.
                memberGateService?.enqueueIfNeeded(it)
            }
        }
    }

    /**
     * 동의를 기록으로 남긴다 — 최초 가입 때 한 번, 그리고 소개팅을 켤 때 한 번 더.
     *
     * 동의 기록은 고치지 않고 쌓는다(MemberConsent). 모임만 하러 온 사람은 민감정보 동의 없이
     * 가입하고, 나중에 소개팅을 켜며 선호 성별을 처음 건넬 때 그 동의가 새 줄로 쌓인다 —
     * 언제 무엇에 동의했는지가 시간 순서대로 남아야 입증이 된다.
     *
     * 동의를 보내지 않은 요청은 통과시킨다 — 이 기능이 없던 앱 버전이 아직 유저 폰에 남아 있어서,
     * 여기서 막으면 그 앱들의 가입이 통째로 실패한다. 모든 유저가 새 버전으로 넘어간 뒤
     * (앱 최소 지원 버전을 올린 뒤) 필수로 조일 수 있다.
     */
    private fun recordConsent(command: CompleteOnboardingCommand, isFirst: Boolean) {
        val agreement = command.consent ?: return
        if (!isFirst) {
            // 이미 회원이다. 새로 쌓을 이유는 민감정보 동의가 처음 들어올 때뿐이다.
            val addsSensitive = agreement.sensitive && !consentRepository.sensitiveAgreedByAccountId(command.accountId)
            if (!addsSensitive) return
        } else if (consentRepository.existsByAccountId(command.accountId)) {
            return
        }
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
