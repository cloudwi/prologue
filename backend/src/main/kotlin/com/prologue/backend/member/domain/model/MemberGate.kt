package com.prologue.backend.member.domain.model

import java.time.Instant
import java.util.UUID

/** 성비 게이트에서의 자리 — 기다리는 중인지, 들어왔는지. */
enum class GateStatus {
    WAITING,
    ADMITTED,
}

/**
 * 한 사람의 게이트 기록 — 언제 줄을 섰고, 언제 누가 들였나.
 *
 * 행이 없는 사람은 입장 상태다. 그래서 이 객체는 "줄을 선 적이 있는 사람"에게만 존재하고,
 * 여성이나 게이트 이전 회원에게는 만들어지지 않는다.
 */
class MemberGate private constructor(
    val accountId: UUID,
    status: GateStatus,
    val queuedAt: Instant,
    admittedAt: Instant?,
    admittedBy: String?,
) {
    var status: GateStatus = status
        private set

    var admittedAt: Instant? = admittedAt
        private set

    /** 누가 들였나 — [ADMITTED_BY_ADMIN](수동) 또는 [ADMITTED_BY_AUTO](스케줄러). */
    var admittedBy: String? = admittedBy
        private set

    val waiting: Boolean get() = status == GateStatus.WAITING

    /** 들인다. 이미 들어와 있으면 아무 일도 하지 않는다(멱등) — 두 번 들이는 건 의미가 없다. */
    fun admit(by: String, now: Instant = Instant.now()): Boolean {
        if (!waiting) return false
        status = GateStatus.ADMITTED
        admittedAt = now
        admittedBy = by
        return true
    }

    companion object {
        const val ADMITTED_BY_ADMIN = "ADMIN"
        const val ADMITTED_BY_AUTO = "AUTO"

        /** 줄을 선다 — 온보딩을 마친 신규 남성이 게이트가 켜진 채로 들어왔을 때. */
        fun enqueue(accountId: UUID, now: Instant = Instant.now()): MemberGate =
            MemberGate(accountId, GateStatus.WAITING, now, admittedAt = null, admittedBy = null)

        /** 영속 저장소에서 복원(인프라 전용). */
        fun reconstitute(
            accountId: UUID,
            status: GateStatus,
            queuedAt: Instant,
            admittedAt: Instant?,
            admittedBy: String?,
        ): MemberGate = MemberGate(accountId, status, queuedAt, admittedAt, admittedBy)
    }
}
