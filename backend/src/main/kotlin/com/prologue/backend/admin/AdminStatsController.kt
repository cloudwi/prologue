package com.prologue.backend.admin

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
    )

    @GetMapping
    fun stats(): AdminStats {
        val kstMidnight = Timestamp.from(LocalDate.now(KST).atStartOfDay(KST).toInstant())
        fun count(sql: String, vararg args: Any): Int =
            jdbc.queryForObject(sql, Int::class.java, *args) ?: 0
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
        )
    }

    companion object {
        private val KST = ZoneId.of("Asia/Seoul")
    }
}
