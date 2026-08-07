package com.prologue.backend.admin

import com.prologue.backend.auth.application.service.AccountModerationService
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

/**
 * 회원 조회·제재 — 웹 어드민(ROLE_ADMIN).
 * 신고 화면의 "계정 정지"와 짝: 여기서 검색해 정지를 해제할 수 있다.
 */
@RestController
@RequestMapping("/admin/members")
class AdminMemberController(
    private val jdbc: JdbcTemplate,
    private val accountModerationService: AccountModerationService,
) {
    data class AdminMemberRow(
        val accountId: String,
        val email: String,
        val status: String,
        val nickname: String?,
        val gender: String?,
        val createdAt: Instant,
        val lastSeenAt: Instant?,
    )

    data class AdminMembersResponse(val members: List<AdminMemberRow>)

    /** 이메일·닉네임 부분 일치 검색. 검색어가 없으면 최근 가입순 50명. */
    @GetMapping
    fun search(@RequestParam(required = false) q: String?): AdminMembersResponse {
        val query = q?.trim() ?: ""
        val like = "%$query%"
        val rows = jdbc.query(
            """
            select a.id, a.email, a.status, a.created_at, a.last_seen_at, m.nickname, m.gender
            from accounts a
            left join members m on m.account_id = a.id
            where ? = '' or a.email ilike ? or m.nickname ilike ?
            order by a.created_at desc
            limit 50
            """.trimIndent(),
            { rs, _ ->
                AdminMemberRow(
                    accountId = rs.getObject("id", UUID::class.java).toString(),
                    email = rs.getString("email"),
                    status = rs.getString("status"),
                    nickname = rs.getString("nickname"),
                    gender = rs.getString("gender"),
                    createdAt = rs.getTimestamp("created_at").toInstant(),
                    lastSeenAt = rs.getTimestamp("last_seen_at")?.toInstant(),
                )
            },
            query, like, like,
        )
        return AdminMembersResponse(rows)
    }

    @PostMapping("/{accountId}/suspend")
    fun suspend(@PathVariable accountId: UUID) = accountModerationService.suspend(accountId)

    @PostMapping("/{accountId}/reactivate")
    fun reactivate(@PathVariable accountId: UUID) = accountModerationService.reactivate(accountId)
}
