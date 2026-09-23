package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.GateStatus
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.GenderGatePolicy
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.model.MemberGate
import com.prologue.backend.member.domain.repository.MemberGateRepository
import com.prologue.backend.notification.application.service.NotificationService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.util.UUID

/**
 * 성비 게이트 유스케이스 — 줄 세우기, 들이기, 지금 누가 기다리는지.
 *
 * 규칙은 [GenderGatePolicy]가 갖고, 여기는 그 규칙을 저장소와 알림에 잇는다.
 * 스위치가 꺼져 있으면 모든 질문에 "게이트 무관"으로 답한다 — WAITING 행이 남아 있어도
 * 소개 쪽에서는 보이지 않는다. 끄는 순간 전원 입장과 같아야 운영자가 안심하고 끌 수 있다.
 */
@Service
class MemberGateService(
    private val gateRepository: MemberGateRepository,
    private val notificationService: NotificationService,
    @param:Value("\${gate.enabled:false}") gateEnabled: Boolean = false,
    @param:Value("\${gate.min-female-ratio:0.8}") gateMinFemaleRatio: Double = 0.8,
    @param:Value("\${gate.active-days:14}") gateActiveDays: Int = 14,
) {
    val policy = GenderGatePolicy(enabled = gateEnabled, minFemaleRatio = gateMinFemaleRatio, activeDays = gateActiveDays)

    val enabled: Boolean get() = policy.enabled

    /**
     * 이 사람의 게이트 상태. null이면 게이트와 무관하다 — 스위치가 꺼졌거나, 여성이거나,
     * 게이트 이전에 가입해 행이 없는 사람(fail-open).
     */
    @Transactional(readOnly = true)
    fun statusOf(accountId: UUID): GateStatus? {
        if (!enabled) return null
        return gateRepository.findByAccountId(accountId)?.status
    }

    /** 매칭 풀에서 빠져 있는 사람인가 — 후보 선정과 오늘의 상대 양쪽이 이 하나를 본다. */
    @Transactional(readOnly = true)
    fun isWaiting(accountId: UUID): Boolean = statusOf(accountId) == GateStatus.WAITING

    /** 지금 기다리는 사람 전부 — 후보 선정이 한 번에 읽어 걸러낸다. 꺼져 있으면 아무도 없다. */
    @Transactional(readOnly = true)
    fun waitingIds(): Set<UUID> = if (enabled) gateRepository.findAllWaitingIds() else emptySet()

    /** 내 차례까지 몇 번째인가(1부터). 기다리는 중이 아니면 null. */
    @Transactional(readOnly = true)
    fun waitingPosition(accountId: UUID): Int? = if (enabled) gateRepository.waitingPosition(accountId) else null

    /**
     * 온보딩을 마친 신규 회원을 게이트에 세운다 — 켜져 있고 남성일 때만. 이미 행이 있으면 건드리지 않는다.
     * 여성과 꺼진 스위치는 아무 행도 만들지 않는다 — 행이 없는 것이 곧 입장 상태다.
     */
    @Transactional
    fun enqueueIfNeeded(member: Member, now: Instant = Instant.now()): Boolean {
        if (!policy.gates(member.gender)) return false
        if (gateRepository.findByAccountId(member.accountId) != null) return false
        gateRepository.save(MemberGate.enqueue(member.accountId, now))
        return true
    }

    /**
     * 한 사람을 들인다(운영자 수동). 실제로 상태가 바뀌었으면 true, 이미 들어와 있거나 행이 없으면 false.
     * 들어온 사람에게는 푸시로 알린다 — 답을 남겨야 소개가 시작된다는 것까지 한 줄에.
     */
    @Transactional
    fun admit(accountId: UUID, by: String = MemberGate.ADMITTED_BY_ADMIN, now: Instant = Instant.now()): Boolean {
        val gate = gateRepository.findByAccountId(accountId) ?: return false
        if (!gate.admit(by, now)) return false
        gateRepository.save(gate)
        notificationService.gateAdmitted(accountId)
        return true
    }

    /**
     * 활성 성비가 기준을 넘는 만큼 오래 기다린 순으로 들인다 — 매시 스케줄러가 부른다.
     * 들인 사람의 계정 id 목록을 돌려준다. 꺼져 있으면 아무 일도 하지 않는다.
     */
    @Transactional
    fun autoAdmit(now: Instant = Instant.now()): List<UUID> {
        if (!enabled) return emptyList()
        val census = census(now)
        val count = policy.admittable(census.activeFemale, census.activeMale)
        if (count <= 0) return emptyList()
        val admitted = mutableListOf<UUID>()
        for (gate in gateRepository.findWaitingOrdered(count)) {
            try {
                if (!gate.admit(MemberGate.ADMITTED_BY_AUTO, now)) continue
                gateRepository.save(gate)
                notificationService.gateAdmitted(gate.accountId)
                admitted += gate.accountId
            } catch (e: RuntimeException) {
                // 한 사람의 실패가 나머지의 입장을 막으면 안 된다
                log.warn("자동 입장 실패 — account={}", gate.accountId, e)
            }
        }
        if (admitted.isNotEmpty()) {
            log.info("성비 게이트 자동 입장 {}명 (활성 여 {} · 남 {}, 대기 {})", admitted.size, census.activeFemale, census.activeMale, census.waiting)
        }
        return admitted
    }

    /** 운영 화면이 보는 현재 값 — 활성 남녀 수, 대기 인원, 지금 들일 수 있는 수. */
    @Transactional(readOnly = true)
    fun census(now: Instant = Instant.now()): GateCensus {
        val active = gateRepository.countActiveByGender(now.minus(Duration.ofDays(policy.activeDays.toLong())))
        val female = active[Gender.FEMALE] ?: 0
        val male = active[Gender.MALE] ?: 0
        return GateCensus(
            enabled = enabled,
            activeFemale = female,
            activeMale = male,
            waiting = gateRepository.countWaiting(),
            admittable = policy.admittable(female, male),
        )
    }

    private companion object {
        val log = LoggerFactory.getLogger(MemberGateService::class.java)
    }
}

/** 게이트의 지금 — 어드민 통계가 그대로 내려보낸다. */
data class GateCensus(
    val enabled: Boolean,
    val activeFemale: Int,
    val activeMale: Int,
    val waiting: Int,
    /** 지금 자동 입장이 돌면 들어올 수 있는 수. 꺼져 있으면 0. */
    val admittable: Int,
)
