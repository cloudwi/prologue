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
    /** 선호 성별은 성적 지향을 드러내므로 민감정보(23조) — 별도로 받은 동의. */
    val sensitive: Boolean,
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
            now: Instant = Instant.now(),
        ): MemberConsent {
            require(legalVersion.isNotBlank()) { "약관 버전이 비어 있습니다" }
            // 필수 항목이 빠진 동의는 기록으로 남길 이유가 없다 — 그 상태로는 가입이 성립하지 않는다.
            if (!terms || !privacy || !age || !sensitive) {
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
                marketing = marketing,
                agreedAt = now,
            )
        }

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
            agreedAt: Instant,
        ) = MemberConsent(id, accountId, legalVersion, terms, privacy, age, sensitive, marketing, agreedAt)
    }
}
