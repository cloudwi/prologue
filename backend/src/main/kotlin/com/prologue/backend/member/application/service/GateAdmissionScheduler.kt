package com.prologue.backend.member.application.service

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * 매시 정각에 활성 성비를 재고 자리가 난 만큼 대기 남성을 들인다.
 *
 * 스위치(gate.enabled)가 꺼져 있으면 [MemberGateService.autoAdmit]이 바로 돌아오므로 여기서는
 * 따로 보지 않는다. 자리가 나는 조건과 순서는 [com.prologue.backend.member.domain.model.GenderGatePolicy].
 */
@Component
class GateAdmissionScheduler(
    private val memberGateService: MemberGateService,
) {
    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Seoul")
    fun admitHourly() {
        try {
            memberGateService.autoAdmit()
        } catch (e: RuntimeException) {
            // 한 시간 뒤에 다시 돈다 — 실패가 스케줄러를 죽이면 대기열이 영영 멈춘다
            log.warn("성비 게이트 자동 입장 실패", e)
        }
    }

    private companion object {
        val log = LoggerFactory.getLogger(GateAdmissionScheduler::class.java)
    }
}
