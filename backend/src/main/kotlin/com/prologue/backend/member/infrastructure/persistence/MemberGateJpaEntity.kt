package com.prologue.backend.member.infrastructure.persistence

import com.prologue.backend.member.domain.model.GateStatus
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** member_gate 테이블 매핑. 계정당 한 행, 들어온 뒤에도 기록으로 남는다. */
@Entity
@Table(name = "member_gate")
class MemberGateJpaEntity(
    @Id
    @Column(name = "account_id", nullable = false, updatable = false)
    val accountId: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    var status: GateStatus,

    @Column(name = "queued_at", nullable = false, updatable = false)
    val queuedAt: Instant,

    @Column(name = "admitted_at")
    var admittedAt: Instant?,

    @Column(name = "admitted_by", length = 40)
    var admittedBy: String?,
)
