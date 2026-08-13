package com.prologue.backend.admin

import com.prologue.backend.member.application.service.MemberPhotoService
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

/**
 * 사진 검수 — 웹 어드민(ROLE_ADMIN). 자동 검수(Vision)를 통과해도 부적절할 수 있어
 * 최근 가입 회원의 사진을 사람 눈으로 한 번 더 훑는다. 삭제는 저장소까지 지운다.
 */
@RestController
@RequestMapping("/admin/photos")
class AdminPhotoController(
    private val jdbc: JdbcTemplate,
    private val memberPhotoService: MemberPhotoService,
) {
    data class MemberPhotos(
        val accountId: String,
        val nickname: String?,
        val createdAt: Instant,
        val photos: List<String>,
    )

    data class PhotosResponse(val members: List<MemberPhotos>)

    data class RemovePhotoRequest(val accountId: UUID, val url: String)

    /** 사진이 있는 최근 가입 회원 30명 — 검수 순찰 대상. */
    @GetMapping
    fun recent(): PhotosResponse {
        val rows = jdbc.query(
            """
            select account_id, nickname, created_at, photo_urls
            from members
            where photo_urls is not null and photo_urls <> ''
            order by created_at desc
            limit 30
            """.trimIndent(),
        ) { rs, _ ->
            MemberPhotos(
                accountId = rs.getObject("account_id", UUID::class.java).toString(),
                nickname = rs.getString("nickname"),
                createdAt = rs.getTimestamp("created_at").toInstant(),
                photos = rs.getString("photo_urls").split(",").filter { it.isNotBlank() },
            )
        }
        return PhotosResponse(rows)
    }

    /** 사진 강제 삭제 — 검수 경로라 최소 장수 제한을 받지 않는다(저장소 베스트 에포트 삭제 포함). */
    @PostMapping("/remove")
    fun remove(@RequestBody request: RemovePhotoRequest) {
        memberPhotoService.stripPhoto(request.accountId, request.url)
    }
}
