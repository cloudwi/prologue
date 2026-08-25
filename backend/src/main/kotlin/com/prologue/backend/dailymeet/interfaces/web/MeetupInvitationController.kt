package com.prologue.backend.dailymeet.interfaces.web

import com.prologue.backend.dailymeet.application.service.MeetupService
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * 공개 초대장 `/m/{id}` — 앱이 아니라 **카카오톡·문자에 붙은 링크**가 부르는 자리.
 *
 * 인증이 없다(SecurityConfig에서 permitAll). 링크를 받은 사람은 아직 회원이 아니고,
 * 미리보기를 읽어 가는 크롤러는 영영 회원이 아니다. 대신 담는 내용을 좁혀서 지킨다 —
 * [MeetupService.invitation]이 참가자·오픈채팅 링크를 아예 싣지 않는다.
 *
 * id가 UUID 꼴이 아니면 404다. 오타 난 링크에 500을 돌려줄 이유가 없다.
 */
@RestController
class MeetupInvitationController(
    private val meetupService: MeetupService,
    @param:Value("\${web.base-url}") private val webBaseUrl: String,
    @param:Value("\${app.ios-store-url}") private val iosStoreUrl: String,
    @param:Value("\${app.android-store-url}") private val androidStoreUrl: String,
) {
    @GetMapping("/m/{id}", produces = [MediaType.TEXT_HTML_VALUE])
    fun invitation(@PathVariable id: String): ResponseEntity<String> {
        val meetupId = runCatching { UUID.fromString(id) }.getOrNull()
        val view = meetupId?.let { meetupService.invitation(it) }
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.TEXT_HTML)
                .body(MeetupInvitationPage.notFound(webBaseUrl))

        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            // 남은 자리가 시시각각 바뀌니 오래 물고 있으면 거짓말이 된다. 5분은 크롤러가
            // 같은 링크를 여러 번 읽어 가는 동안 무료 티어를 덜 깨우는 정도의 짧은 숨.
            .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
            .body(MeetupInvitationPage.render(view, webBaseUrl, iosStoreUrl, androidStoreUrl))
    }
}
