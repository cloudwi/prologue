package com.prologue.backend.dailymeet.interfaces.web

import com.prologue.backend.dailymeet.application.service.MeetupService
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.util.concurrent.TimeUnit

/**
 * 공개 모임 목록 `/m` — `prologue.day/meetups`가 여기로 넘어온다(render.yaml).
 *
 * 인증이 없다. 검색 크롤러는 영영 회원이 아니고, 링크를 받은 사람도 아직 아니다.
 * 담기는 것은 초대장과 같은 범위다 — 참가자도, 오픈채팅 링크도 없다.
 */
@RestController
class MeetupListController(
    private val meetupService: MeetupService,
    @param:Value("\${web.base-url}") private val webBaseUrl: String,
) {
    @GetMapping("/m", produces = [MediaType.TEXT_HTML_VALUE])
    fun list(): ResponseEntity<String> = ResponseEntity.ok()
        .contentType(MediaType.TEXT_HTML)
        // 남은 자리가 바뀌니 오래 물면 거짓말이 된다. 초대장과 같은 5분.
        .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
        .body(MeetupListPage.render(meetupService.publicUpcoming(), webBaseUrl))
}
