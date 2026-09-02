package com.prologue.backend.member.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 회원이 가입 시 남긴 동의 기록.
 *
 * 개인정보보호법 22조는 동의 사항을 구분해 각각 받도록 하고, 받았다는 사실의 입증 책임은
 * 사업자에게 둔다. 그래서 "동의했다"는 사실만이 아니라 어떤 항목에·어느 약관 버전에
 * 동의했는지를 함께 남긴다. 한번 남긴 기록은 고치지 않는다 — 약관이 개정되면 새 기록이 쌓인다.
 */
class MemberConsent private constructor(
    val id: UUID,
    val accountId: UUID,
    /** 동의 시점의 약관 버전. 개정되면 값이 달라져 어느 문서에 동의했는지 되짚을 수 있다. */
    val legalVersion: String,
    val terms: Boolean,
    val privacy: Boolean,
    val age: Boolean,
    /** 선호 성별은 성적 지향을 드러내므로 민감정보(23조) — 소개팅을 켤 때 별도로 받는다. */
    val sensitive: Boolean,
    /**
     * 종교·정치 성향(신념) 수집 동의 — 같은 23조지만 **다른 항목**이다.
     * 동의는 항목별로 받아야 하므로(22조) 선호 성별 동의로 갈음하지 않는다. 프로필에 처음
     * 적을 때 받고, 지울 때는 묻지 않는다. 이 줄이 false여도 서비스 이용에는 아무 영향이 없다.
     */
    val beliefs: Boolean,
    /** 유일한 선택 항목. 거부해도 가입은 된다(16조 3항). */
    val marketing: Boolean,
    val agreedAt: Instant,
) {
    companion object {
        fun record(
            accountId: UUID,
            legalVersion: String,
            terms: Boolean,
            privacy: Boolean,
            age: Boolean,
            sensitive: Boolean,
            marketing: Boolean,
            beliefs: Boolean = false,
            now: Instant = Instant.now(),
        ): MemberConsent {
            require(legalVersion.isNotBlank()) { "약관 버전이 비어 있습니다" }
            // 필수 항목이 빠진 동의는 기록으로 남길 이유가 없다 — 그 상태로는 가입이 성립하지 않는다.
            //
            // 민감정보(선호 성별)는 여기에 없다. 모임만 하러 온 사람에게는 선호 성별을 묻지 않으므로,
            // 받지도 않은 정보에 동의를 요구하는 꼴이 된다. 최소수집 원칙이 그렇게 말한다 —
            // 이 동의는 소개팅을 켜는 순간 별도 기록으로 쌓인다.
            if (!terms || !privacy || !age) {
                throw MemberDomainException("필수 항목에 모두 동의해야 가입할 수 있어요")
            }
            return MemberConsent(
                id = UUID.randomUUID(),
                accountId = accountId,
                legalVersion = legalVersion,
                terms = terms,
                privacy = privacy,
                age = age,
                sensitive = sensitive,
                beliefs = beliefs,
                marketing = marketing,
                agreedAt = now,
            )
        }

        /**
         * 신념(종교·정치 성향) 수집에 동의한 사실만 새 줄로 남긴다 — 프로필에 처음 적는 순간.
         *
         * 약관·개인정보·연령은 가입 때 이미 동의했고 지금도 그 아래에서 서비스를 쓰므로 true다.
         * [sensitive]·[marketing]이 false인 것은 **철회가 아니라 "이번에 새로 동의한 항목이
         * 아니다"는 뜻**이다 — 이 표는 고치지 않고 쌓기만 하며, 어떤 항목에 동의했는지는
         * 그 항목이 true인 줄이 하나라도 있는지로 판단한다.
         */
        fun recordBeliefs(accountId: UUID, legalVersion: String, now: Instant = Instant.now()): MemberConsent =
            record(
                accountId = accountId,
                legalVersion = legalVersion,
                terms = true,
                privacy = true,
                age = true,
                sensitive = false,
                marketing = false,
                beliefs = true,
                now = now,
            )

        /** 영속 계층이 저장된 행을 도메인으로 되살릴 때 쓴다. */
        fun reconstitute(
            id: UUID,
            accountId: UUID,
            legalVersion: String,
            terms: Boolean,
            privacy: Boolean,
            age: Boolean,
            sensitive: Boolean,
            marketing: Boolean,
            beliefs: Boolean,
            agreedAt: Instant,
        ) = MemberConsent(id, accountId, legalVersion, terms, privacy, age, sensitive, beliefs, marketing, agreedAt)
    }
}
