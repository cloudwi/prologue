package com.prologue.backend.member.infrastructure.persistence

import com.prologue.backend.member.domain.model.MemberConsent
import com.prologue.backend.member.domain.repository.MemberConsentRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

interface MemberConsentJpaRepository : JpaRepository<MemberConsentJpaEntity, UUID> {
    fun existsByAccountId(accountId: UUID): Boolean

    fun existsByAccountIdAndSensitiveIsTrue(accountId: UUID): Boolean

    fun existsByAccountIdAndBeliefsIsTrue(accountId: UUID): Boolean
}

/** MemberConsentRepository 포트의 JPA 어댑터. */
@Repository
class MemberConsentPersistenceAdapter(
    private val jpa: MemberConsentJpaRepository,
) : MemberConsentRepository {

    override fun save(consent: MemberConsent): MemberConsent = jpa.save(consent.toEntity()).toDomain()

    override fun existsByAccountId(accountId: UUID): Boolean = jpa.existsByAccountId(accountId)

    override fun sensitiveAgreedByAccountId(accountId: UUID): Boolean =
        jpa.existsByAccountIdAndSensitiveIsTrue(accountId)

    override fun beliefsAgreedByAccountId(accountId: UUID): Boolean =
        jpa.existsByAccountIdAndBeliefsIsTrue(accountId)

    private fun MemberConsent.toEntity() = MemberConsentJpaEntity(
        id = id,
        accountId = accountId,
        legalVersion = legalVersion,
        terms = terms,
        privacy = privacy,
        age = age,
        sensitive = sensitive,
        beliefs = beliefs,
        marketing = marketing,
        agreedAt = agreedAt,
    )

    private fun MemberConsentJpaEntity.toDomain() = MemberConsent.reconstitute(
        id = id,
        accountId = accountId,
        legalVersion = legalVersion,
        terms = terms,
        privacy = privacy,
        age = age,
        sensitive = sensitive,
        beliefs = beliefs,
        marketing = marketing,
        agreedAt = agreedAt,
    )
}
