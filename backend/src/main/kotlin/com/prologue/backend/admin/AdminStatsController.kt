package com.prologue.backend.admin

import com.prologue.backend.member.application.service.MemberGateService
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.sql.Timestamp
import java.time.LocalDate
import java.time.ZoneId

/**
 * 운영 지표 — 웹 어드민 대시보드(ROLE_ADMIN).
 * 여러 도메인을 가로지르는 읽기 전용 집계라 도메인 계층을 태우지 않고 SQL로 바로 센다.
 * 성비·주간 활성은 나중에 랜딩 공개 지표의 원천이기도 하다(문턱값 걸고 공개 예정).
 */
@RestController
@RequestMapping("/admin/stats")
class AdminStatsController(
    private val jdbc: JdbcTemplate,
    private val memberGateService: MemberGateService,
) {
    data class AdminStats(
        val totalMembers: Int,
        val maleMembers: Int,
        val femaleMembers: Int,
        val joinedToday: Int,
        /** 최근 7일 안에 한 번이라도 접속한 계정 수(accounts.last_seen_at 기준). */
        val weeklyActive: Int,
        val answersToday: Int,
        /** 오늘 공개된 소개 카드 수(daily_reveals) — 0에 가까우면 성비·풀 부족 신호. */
        val revealsToday: Int,
        val pendingReports: Int,
        val suspendedAccounts: Int,
        /** 성비 게이트 스위치(GENDER_GATE)가 켜져 있는가. */
        val gateEnabled: Boolean,
        /** 게이트에서 기다리는 남성 수. 스위치가 꺼져 있어도 행은 센다 — 켜면 이 사람들이 곧바로 대기가 된다. */
        val gateWaiting: Int,
        /** 게이트가 비율을 재는 활성 여성/남성 수(최근 gate.active-days 안에 접속한 ACTIVE 계정). */
        val activeFemale: Int,
        val activeMale: Int,
        /** 지금 자동 입장이 돌면 들어올 수 있는 수. 꺼져 있으면 0. */
        val gateAdmittable: Int,
    )

    @GetMapping
    fun stats(): AdminStats {
        val kstMidnight = Timestamp.from(LocalDate.now(KST).atStartOfDay(KST).toInstant())
        fun count(sql: String, vararg args: Any): Int =
            jdbc.queryForObject(sql, Int::class.java, *args) ?: 0
        val gate = memberGateService.census()
        return AdminStats(
            totalMembers = count("select count(*) from members"),
            maleMembers = count("select count(*) from members where gender = 'MALE'"),
            femaleMembers = count("select count(*) from members where gender = 'FEMALE'"),
            joinedToday = count("select count(*) from members where created_at >= ?", kstMidnight),
            weeklyActive = count("select count(*) from accounts where last_seen_at >= now() - interval '7 days'"),
            answersToday = count("select count(*) from answers where created_at >= ?", kstMidnight),
            revealsToday = count("select count(*) from daily_reveals where created_at >= ?", kstMidnight),
            pendingReports = count("select count(*) from reports where status = 'PENDING'"),
            suspendedAccounts = count("select count(*) from accounts where status = 'SUSPENDED'"),
            gateEnabled = gate.enabled,
            gateWaiting = gate.waiting,
            activeFemale = gate.activeFemale,
            activeMale = gate.activeMale,
            gateAdmittable = gate.admittable,
        )
    }

    companion object {
        private val KST = ZoneId.of("Asia/Seoul")
    }
}
