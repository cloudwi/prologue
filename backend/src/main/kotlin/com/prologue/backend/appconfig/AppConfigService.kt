package com.prologue.backend.appconfig

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.concurrent.atomic.AtomicReference

/**
 * 앱 부팅 설정 — DB에 있으면 그 값, 없으면 application.yaml의 값.
 *
 * **두 가지가 이 클래스의 전부다.**
 *
 * 하나, **fail-open**. 행이 없거나 DB가 흔들리면 기본값으로 물러선다. 여기 담긴 건 앱을
 * 열지 말지 정하는 값이라, 설정을 못 읽었다고 세상의 모든 프롤로그가 잠기면 안 된다.
 * 기본값(1.0.0)은 아무도 막지 않는 값이므로 물러서는 방향이 곧 여는 방향이다.
 *
 * 둘, **짧은 캐시**. /app-config는 앱이 켜질 때마다, 로그인 전에 부른다. 그때마다 DB를
 * 두드리면 부팅이 무료 티어 커넥션 풀에 걸린다. 30초면 충분하다 — 이 값은 몇 달에 한 번
 * 바뀌고, 바꾼 뒤 30초 안에 반영되면 사람 눈에는 즉시다.
 */
@Service
class AppConfigService(
    private val repository: AppSettingRepository,
    @param:Value("\${app.min-supported-version}") private val defaultMinSupportedVersion: String,
    @param:Value("\${app.latest-version}") private val defaultLatestVersion: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val cache = AtomicReference<Snapshot?>(null)

    private data class Snapshot(val values: Map<String, String>, val at: Instant)

    data class Settings(val minSupportedVersion: String, val latestVersion: String)

    fun settings(): Settings {
        val values = load()
        return Settings(
            minSupportedVersion = values[AppSettingKey.MIN_SUPPORTED_VERSION] ?: defaultMinSupportedVersion,
            latestVersion = values[AppSettingKey.LATEST_VERSION] ?: defaultLatestVersion,
        )
    }

    /** 설정을 바꾼다 — 저장하고 캐시를 곧바로 버린다. 되돌릴 때 30초를 기다릴 수는 없다. */
    @Transactional
    fun put(key: String, value: String) {
        require(key in ALLOWED) { "알 수 없는 설정이에요: $key" }
        val clean = value.trim()
        require(VERSION.matches(clean)) { "버전은 1.3.0 같은 꼴이어야 해요" }
        val row = repository.findById(key).orElse(null)
        if (row == null) {
            repository.save(AppSettingJpaEntity(key, clean))
        } else {
            row.value = clean
            row.updatedAt = Instant.now()
            repository.save(row)
        }
        cache.set(null)
    }

    /** 설정을 지운다 — application.yaml의 기본값으로 돌아간다. */
    @Transactional
    fun clear(key: String) {
        require(key in ALLOWED) { "알 수 없는 설정이에요: $key" }
        repository.deleteById(key)
        cache.set(null)
    }

    private fun load(): Map<String, String> {
        val now = Instant.now()
        cache.get()?.let { if (it.at.plusSeconds(TTL_SECONDS).isAfter(now)) return it.values }
        return try {
            val fresh = repository.findAll().associate { it.key to it.value }
            cache.set(Snapshot(fresh, now))
            fresh
        } catch (e: Exception) {
            /*
             * 읽지 못했으면 **막지 않는 쪽**으로 간다.
             *
             * 마지막으로 읽은 값이 있으면 그걸 쓰고(그때는 열려 있었다), 그마저 없으면 빈 값 —
             * 곧 application.yaml의 기본값이다. 어느 쪽이든 앱은 열린다.
             */
            log.warn("앱 설정을 읽지 못해 기본값으로 갑니다: {}", e.message)
            cache.get()?.values ?: emptyMap()
        }
    }

    private companion object {
        const val TTL_SECONDS = 30L
        val ALLOWED = setOf(AppSettingKey.MIN_SUPPORTED_VERSION, AppSettingKey.LATEST_VERSION)
        val VERSION = Regex("""\d+\.\d+\.\d+""")
    }
}
