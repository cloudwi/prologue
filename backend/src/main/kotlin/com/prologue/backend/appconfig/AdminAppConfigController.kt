package com.prologue.backend.appconfig

import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 앱 설정 — 어드민(/admin, ROLE_ADMIN)에서 켜고 끈다.
 *
 * 여기서 바꾸는 min-supported-version은 **그 미만 앱을 못 열게 막는다.** 되돌리는 것도
 * 여기서 즉시 되므로, 잘못 걸었을 때 배포나 재시작을 기다릴 일이 없다.
 *
 * 응답에 기본값(application.yaml)을 함께 실어 보낸다 — 화면이 "지금 값이 DB에서 온 것인지
 * 기본값인지"를 말해줄 수 있어야 지우기 버튼이 무슨 뜻인지 알 수 있다.
 */
@RestController
@RequestMapping("/admin/app-config")
class AdminAppConfigController(
    private val appConfigService: AppConfigService,
    private val repository: AppSettingRepository,
    @param:Value("\${app.min-supported-version}") private val defaultMinSupportedVersion: String,
    @param:Value("\${app.latest-version}") private val defaultLatestVersion: String,
) {
    data class SettingView(
        val key: String,
        /** 지금 쓰이는 값 — DB에 있으면 그것, 없으면 기본값. */
        val value: String,
        /** DB에 행이 있는지. false면 아래 기본값이 쓰이고 있다는 뜻이다. */
        val overridden: Boolean,
        val defaultValue: String,
    )

    data class Response(val settings: List<SettingView>)

    data class PutRequest(val value: String)

    @GetMapping
    fun get(): Response {
        val rows = repository.findAll().associate { it.key to it.value }
        val now = appConfigService.settings()
        return Response(
            listOf(
                view(AppSettingKey.MIN_SUPPORTED_VERSION, now.minSupportedVersion, rows, defaultMinSupportedVersion),
                view(AppSettingKey.LATEST_VERSION, now.latestVersion, rows, defaultLatestVersion),
            ),
        )
    }

    private fun view(key: String, value: String, rows: Map<String, String>, fallback: String) =
        SettingView(key, value, rows.containsKey(key), fallback)

    @PutMapping("/{key}")
    fun put(@PathVariable key: String, @RequestBody request: PutRequest) {
        appConfigService.put(key, request.value)
    }

    /** 기본값으로 되돌린다 — 강제 업데이트를 푸는 가장 빠른 길. */
    @DeleteMapping("/{key}")
    fun clear(@PathVariable key: String) {
        appConfigService.clear(key)
    }
}
