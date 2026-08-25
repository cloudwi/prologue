package com.prologue.backend.support

import org.junit.jupiter.api.Tag
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.test.context.ActiveProfiles
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

/**
 * 진짜 Postgres 위에서 도는 리포지토리 테스트의 바탕.
 *
 * 유닛 테스트(mockk)가 못 잡는 것을 잡는다:
 * - **JPA 매핑** — 파생 쿼리가 실제 영속 속성으로 풀리는가(`@EmbeddedId`가 특히 잘 속인다)
 * - **마이그레이션** — V*.sql이 실제로 도는가, 엔티티와 어긋나지 않는가(`ddl-auto: validate`)
 *
 * 2026-08-25에 이 그물이 없어서 `meetup_follows`의 파생 쿼리 오류가 배포까지 갔고,
 * `GET /meetups` 전체가 500이 됐다. 유닛 테스트 228건은 전부 초록이었다.
 *
 * 컨테이너는 클래스마다 새로 띄우지 않는다 — `withReuse` 없이도 static이라 JVM 안에서 공유된다.
 * Docker가 없는 환경에서는 이 테스트들이 실패하므로 `integration` 태그로 갈라 둔다.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("integration")
// Docker가 없는 환경(일부 CI·동료 노트북)에서는 조용히 건너뛴다 — 통합 테스트가 없다고 빌드가 죽으면 안 된다.
@Testcontainers(disabledWithoutDocker = true)
@Tag("integration")
abstract class PostgresRepositoryTest {

    companion object {
        @Container
        @ServiceConnection
        @JvmStatic
        val postgres: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:16-alpine")
    }
}
