package com.prologue.backend.appconfig

import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 앱이 부팅하며 가장 먼저 묻는 설정 — 로그인 전에 부르므로 인증 없이 열려 있다.
 *
 * 앱은 웹과 달리 강제로 새 코드를 밀어넣을 수 없어서, 유저 폰에는 옛 바이너리가 계속 남는다.
 * 서버가 하위 호환을 깰 수밖에 없을 때 min-supported-version을 올리면 그 미만 앱은
 * 스토어로 안내하는 화면에 막힌다. 값은 환경변수라 재배포 없이 조정할 수 있다.
 */
@RestController
@RequestMapping("/app-config")
class AppConfigController(
    @param:Value("\${app.min-supported-version}") private val minSupportedVersion: String,
    @param:Value("\${app.latest-version}") private val latestVersion: String,
    @param:Value("\${app.ios-store-url}") private val iosStoreUrl: String,
    @param:Value("\${app.android-store-url}") private val androidStoreUrl: String,
) {
    data class AppConfigResponse(
        /** 이 버전 미만은 접속을 막는다. */
        val minSupportedVersion: String,
        /** 스토어에 올라가 있는 최신 버전. 지금은 앱이 쓰지 않지만 "새 버전이 나왔어요" 안내에 쓸 자리. */
        val latestVersion: String,
        val iosStoreUrl: String,
        val androidStoreUrl: String,
    )

    @GetMapping
    fun get() = AppConfigResponse(minSupportedVersion, latestVersion, iosStoreUrl, androidStoreUrl)
}
