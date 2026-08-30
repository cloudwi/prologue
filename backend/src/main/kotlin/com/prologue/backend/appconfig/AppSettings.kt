package com.prologue.backend.appconfig

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.jpa.repository.JpaRepository
import java.time.Instant

/**
 * 운영 중에 바뀌는 설정 한 줄.
 *
 * 값은 전부 문자열이다. 타입을 나누면 칸이 늘고, 여기 담기는 건 대개 버전 문자열이나
 * 스위치라 그럴 만한 값이 아니다.
 */
@Entity
@Table(name = "app_settings")
class AppSettingJpaEntity(
    @Id
    @Column(name = "key", nullable = false, length = 64)
    val key: String,

    @Column(name = "value", nullable = false, columnDefinition = "text")
    var value: String,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)

interface AppSettingRepository : JpaRepository<AppSettingJpaEntity, String>

/** 설정 키 — 오타 한 번이면 조용히 기본값으로 돌아가므로 문자열을 흘려 쓰지 않는다. */
object AppSettingKey {
    const val MIN_SUPPORTED_VERSION = "min-supported-version"
    const val LATEST_VERSION = "latest-version"
}
