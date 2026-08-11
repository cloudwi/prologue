package com.prologue.backend.member.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** member_consents 테이블 매핑. 한번 저장하면 갱신하지 않는 append-only 기록. */
@Entity
@Table(name = "member_consents")
class MemberConsentJpaEntity(
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    val id: UUID,

    @Column(name = "account_id", nullable = false, updatable = false)
    val accountId: UUID,

    @Column(name = "legal_version", nullable = false, length = 20, updatable = false)
    val legalVersion: String,

    @Column(name = "terms", nullable = false, updatable = false)
    val terms: Boolean,

    @Column(name = "privacy", nullable = false, updatable = false)
    val privacy: Boolean,

    @Column(name = "age", nullable = false, updatable = false)
    val age: Boolean,

    @Column(name = "sensitive", nullable = false, updatable = false)
    val sensitive: Boolean,

    @Column(name = "marketing", nullable = false, updatable = false)
    val marketing: Boolean,

    @Column(name = "agreed_at", nullable = false, updatable = false)
    val agreedAt: Instant,
)
