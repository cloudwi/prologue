package com.prologue.backend.dailymeet.interfaces.web

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.net.URI

/**
 * 이전 웹 모임 목록 주소. Render에 남은 `/meetups` rewrite도 이 경로를 호출하므로
 * 목록 데이터를 읽지 않고 앱 다운로드로 보낸다. 앱 JSON API와 공유 초대장은 별도다.
 */
@RestController
class MeetupListController(
    @param:Value("\${web.base-url}") private val webBaseUrl: String,
) {
    @GetMapping("/m", produces = [MediaType.TEXT_HTML_VALUE])
    fun list(): ResponseEntity<Void> = ResponseEntity.status(HttpStatus.FOUND)
        .location(URI.create("${webBaseUrl.trimEnd('/')}/download"))
        .cacheControl(CacheControl.noStore())
        .build()
}
