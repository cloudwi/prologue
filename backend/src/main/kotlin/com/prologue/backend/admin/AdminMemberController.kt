package com.prologue.backend.admin

import com.prologue.backend.auth.application.service.AccountModerationService
import com.prologue.backend.dailymeet.application.service.InkService
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.RequestBody
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
    private val inkService: InkService,
) {
    data class GrantInksRequest(val amount: Int)

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

    data class AdminQA(val question: String?, val content: String, val createdAt: Instant?)

    data class AdminMemberProfile(
        val nickname: String?,
        val gender: String?,
        val birthDate: String?,
        val region: String?,
        val bio: String?,
        val heightCm: Int?,
        val hobbies: String?,
        val interests: String?,
        val strengths: String?,
        val phone: String?,
        val photos: List<String>,
        val letters: List<AdminQA>,
        val answers: List<AdminQA>,
    )

    data class AdminMemberProfileResponse(val profile: AdminMemberProfile?)

    /** 회원 프로필 상세 — 신고·검수 때 회원 화면을 오가지 않고 어드민에서 바로 본다. */
    @GetMapping("/{accountId}/profile")
    fun profile(@PathVariable accountId: UUID): AdminMemberProfileResponse {
        val base = jdbc.query(
            """
            select nickname, gender, birth_date, region, bio, height_cm, hobbies, interests, strengths, phone, photo_urls
            from members where account_id = ?
            """.trimIndent(),
            { rs, _ ->
                AdminMemberProfile(
                    nickname = rs.getString("nickname"),
                    gender = rs.getString("gender"),
                    birthDate = rs.getDate("birth_date")?.toString(),
                    region = rs.getString("region"),
                    bio = rs.getString("bio"),
                    heightCm = rs.getObject("height_cm") as Int?,
                    hobbies = rs.getString("hobbies"),
                    interests = rs.getString("interests"),
                    strengths = rs.getString("strengths"),
                    phone = rs.getString("phone"),
                    photos = (rs.getString("photo_urls") ?: "").split(",").filter { it.isNotBlank() },
                    letters = emptyList(),
                    answers = emptyList(),
                )
            },
            accountId,
        ).firstOrNull() ?: return AdminMemberProfileResponse(null)

        val letters = jdbc.query(
            """
            select q.content as question, pl.content, pl.updated_at
            from profile_letters pl left join questions q on q.id = pl.question_id
            where pl.account_id = ? order by pl.created_at
            """.trimIndent(),
            { rs, _ -> AdminQA(rs.getString("question"), rs.getString("content"), rs.getTimestamp("updated_at")?.toInstant()) },
            accountId,
        )
        val answers = jdbc.query(
            """
            select q.content as question, an.content, an.created_at
            from answers an left join questions q on q.id = an.question_id
            where an.account_id = ? order by an.created_at desc limit 10
            """.trimIndent(),
            { rs, _ -> AdminQA(rs.getString("question"), rs.getString("content"), rs.getTimestamp("created_at")?.toInstant()) },
            accountId,
        )
        return AdminMemberProfileResponse(base.copy(letters = letters, answers = answers))
    }

    @PostMapping("/{accountId}/suspend")
    fun suspend(@PathVariable accountId: UUID) = accountModerationService.suspend(accountId)

    @PostMapping("/{accountId}/reactivate")
    fun reactivate(@PathVariable accountId: UUID) = accountModerationService.reactivate(accountId)

    /** 잉크 수동 지급 — CS 보상 등. 원장(reason)에 어드민 지급으로 남는다. */
    @PostMapping("/{accountId}/grant-ink")
    fun grantInk(@PathVariable accountId: UUID, @RequestBody request: GrantInksRequest) {
        require(request.amount in 1..100) { "지급 수량은 1~100장이어야 해요" }
        inkService.grantTo(accountId, request.amount, "ADMIN_GRANT")
    }
}
