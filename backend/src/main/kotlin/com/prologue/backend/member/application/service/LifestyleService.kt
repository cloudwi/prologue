package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Drinking
import com.prologue.backend.member.domain.model.MeetFrequency
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.model.Smoking
import com.prologue.backend.member.domain.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 생활 습관 — 흡연·음주·만나는 빈도.
 *
 * 민감정보가 아니라 동의는 필요 없다([BeliefsService]와 그 점이 다르다). 그런데도 프로필 저장과
 * 길을 나눈 이유는 하나뿐이다: 프로필 저장(PUT /members/me)은 전체 덮어쓰기라, 이 항목을 모르는
 * 화면이 저장 한 번으로 조용히 지워버린다. 항목이 늘 때마다 옛 화면이 지우는 값이 늘어나는 구조는
 * 고쳐야 할 구조지만, 그 전까지는 새 항목을 그 길에 태우지 않는 것이 싸다.
 */
@Service
class LifestyleService(
    private val memberRepository: MemberRepository,
) {
    data class LifestyleView(
        val smoking: Smoking?,
        val drinking: Drinking?,
        val meetFrequency: MeetFrequency?,
    )

    @Transactional(readOnly = true)
    fun view(accountId: UUID): LifestyleView {
        val member = memberRepository.findByAccountId(accountId)
            ?: throw MemberDomainException("프로필을 먼저 만들어주세요")
        return LifestyleView(member.smoking, member.drinking, member.meetFrequency)
    }

    /** 셋을 한 번에 저장한다. 보낸 값이 그대로 저장되고, null은 "안 고름"이다. */
    @Transactional
    fun update(
        accountId: UUID,
        smoking: Smoking?,
        drinking: Drinking?,
        meetFrequency: MeetFrequency?,
    ): LifestyleView {
        val member = memberRepository.findByAccountId(accountId)
            ?: throw MemberDomainException("프로필을 먼저 만들어주세요")
        member.updateLifestyle(smoking, drinking, meetFrequency)
        memberRepository.save(member)
        return LifestyleView(smoking, drinking, meetFrequency)
    }
}
