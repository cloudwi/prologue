package com.prologue.backend.admin

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

/**
 * 문답 모니터링 — 웹 어드민(ROLE_ADMIN). 최근 답변을 훑어 커뮤니티 톤을 지킨다.
 * 답변은 상대에게 공개되는 콘텐츠라 운영 열람 대상이지만, 편지는 사적 대화라 신고된 것만 본다.
 */
@RestController
@RequestMapping("/admin/answers")
class AdminAnswerController(
    private val jdbc: JdbcTemplate,
) {
    data class AdminAnswerRow(
        val accountId: String,
        val nickname: String?,
        val question: String?,
        val content: String,
        val createdAt: Instant,
    )

    data class AdminAnswersResponse(val answers: List<AdminAnswerRow>)

    /** 최근 답변 50개, 최신순. q가 있으면 닉네임·답변 내용 부분 일치로 거른다. */
    @GetMapping
    fun recent(@RequestParam(required = false) q: String?): AdminAnswersResponse {
        val keyword = q?.trim().orEmpty()
        val pattern = "%$keyword%"
        val rows = jdbc.query(
            """
            select an.account_id, an.content, an.created_at, m.nickname, q.content as question
            from answers an
            left join members m on m.account_id = an.account_id
            left join questions q on q.id = an.question_id
            where ? = '' or m.nickname ilike ? or an.content ilike ?
            order by an.created_at desc
            limit 50
            """.trimIndent(),
            { rs, _ ->
                AdminAnswerRow(
                    accountId = rs.getObject("account_id", UUID::class.java).toString(),
                    nickname = rs.getString("nickname"),
                    question = rs.getString("question"),
                    content = rs.getString("content"),
                    createdAt = rs.getTimestamp("created_at").toInstant(),
                )
            },
            keyword, pattern, pattern,
        )
        return AdminAnswersResponse(rows)
    }
}
