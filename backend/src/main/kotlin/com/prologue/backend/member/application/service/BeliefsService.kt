package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.MemberConsent
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.model.PoliticalLeaning
import com.prologue.backend.member.domain.model.Religion
import com.prologue.backend.member.domain.repository.MemberConsentRepository
import com.prologue.backend.member.domain.repository.MemberRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 종교·정치 성향 — 민감정보(개인정보보호법 23조)라 프로필의 다른 항목과 길을 나눈다.
 *
 * **전용 경로인 이유**: 프로필 저장(PUT /members/me)은 전체 덮어쓰기다. 이 항목을 거기 실으면
 * 항목을 모르는 옛 앱이 프로필을 한 번 저장할 때마다 조용히 지워버린다. 동의까지 받고 적은
 * 값이 그렇게 사라지면 안 된다.
 *
 * **동의**: 적을 때 한 번 받는다. 가입 때 받은 민감정보 동의(선호 성별)와 같은 조항이지만
 * 다른 항목이라 갈음하지 않는다 — 동의는 항목별로(22조). 이미 동의한 사람에게는 다시 묻지 않는다.
 * **지울 때는 묻지 않는다** — 삭제·처리정지는 권리지 거래가 아니다.
 */
@Service
class BeliefsService(
    private val memberRepository: MemberRepository,
    private val consentRepository: MemberConsentRepository,
) {
    data class BeliefsView(
        val religion: Religion?,
        val politicalLeaning: PoliticalLeaning?,
        /** 이미 동의 기록이 있는지 — 화면이 동의 체크박스를 또 보여줄지 정한다. */
        val consented: Boolean,
    )

    @Transactional(readOnly = true)
    fun view(accountId: UUID): BeliefsView {
        val member = memberRepository.findByAccountId(accountId)
            ?: throw MemberDomainException("프로필을 먼저 만들어주세요")
        return BeliefsView(member.religion, member.politicalLeaning, consentRepository.beliefsAgreedByAccountId(accountId))
    }

    /**
     * 적거나(동의 필요) 지운다(동의 불필요).
     *
     * @param consented 이번 요청에서 민감정보 수집에 동의했는지. 이미 동의 기록이 있으면 그것으로 갈음한다.
     * @param legalVersion 동의 시점의 약관 버전 — 새 동의를 남길 때만 쓰인다.
     */
    @Transactional
    fun update(
        accountId: UUID,
        religion: Religion?,
        politicalLeaning: PoliticalLeaning?,
        consented: Boolean,
        legalVersion: String?,
    ): BeliefsView {
        val member = memberRepository.findByAccountId(accountId)
            ?: throw MemberDomainException("프로필을 먼저 만들어주세요")

        val writing = religion != null || politicalLeaning != null
        var agreed = consentRepository.beliefsAgreedByAccountId(accountId)

        if (writing && !agreed) {
            if (!consented) throw MemberDomainException("종교·정치 성향은 민감정보예요. 수집에 동의해야 적을 수 있어요")
            val version = legalVersion?.trim()?.ifBlank { null }
                ?: throw MemberDomainException("약관 버전이 없어 동의를 기록할 수 없어요")
            consentRepository.save(MemberConsent.recordBeliefs(accountId, version))
            agreed = true
        }

        member.updateBeliefs(religion, politicalLeaning)
        memberRepository.save(member)
        return BeliefsView(religion, politicalLeaning, agreed)
    }
}
