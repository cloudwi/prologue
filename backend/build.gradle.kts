plugins {
    kotlin("jvm") version "2.3.21"
    kotlin("plugin.spring") version "2.3.21"
    id("org.springframework.boot") version "4.1.0"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("plugin.jpa") version "2.3.21"
}

group = "com.prologue"
version = "0.0.1-SNAPSHOT"
description = "backend"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.springframework.boot:spring-boot-flyway") // Spring Boot 4: Flyway 자동설정 모듈(분리됨). flyway-core를 전이 포함
    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    runtimeOnly("org.postgresql:postgresql")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
    testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    // 에러 모니터링 — 유저가 겪는 500을 우리가 먼저 안다. DSN(SENTRY_DSN)이 없으면 조용히 비활성.
    // 스타터(sentry-spring-boot-starter-jakarta)는 쓰지 않는다: Spring Boot 3 전용이라
    // Boot 4에서 옮겨진 RestClientCustomizer를 찾다 컨텍스트가 죽는다(contextLoads가 잡아냄).
    // 코어 + 로그백 연동은 프레임워크 버전을 타지 않는다 — 초기화는 config/SentryConfig가 한다.
    implementation("io.sentry:sentry:8.16.0")
    implementation("io.sentry:sentry-logback:8.16.0")
    testImplementation("io.mockk:mockk:1.14.2")
    // 컨텍스트가 실제로 뜨는지 보려면 DataSource가 있어야 한다. 운영은 Postgres지만
    // 기동 검증에는 인메모리로 충분하다 — 여기서 잡으려는 건 쿼리가 아니라 빈 배선이다.
    testRuntimeOnly("com.h2database:h2")
    // 진짜 Postgres에 마이그레이션을 돌려 리포지토리를 검증한다.
    // H2 + ddl-auto로는 못 잡는 것들이 있다 — JPA 매핑(@EmbeddedId 파생 쿼리)과 마이그레이션 자체가 그렇다.
    // 2026-08-25에 그 틈으로 GET /meetups 전체가 500이 되는 버그가 배포까지 갔다.
    // Boot 4의 의존성 관리에는 Testcontainers BOM이 없어 버전을 직접 고정한다.
    testImplementation(platform("org.testcontainers:testcontainers-bom:1.21.3"))
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

// 실행 가능한 boot jar만 만들도록 일반 jar 비활성화 (Docker COPY 시 모호함 제거)
tasks.named<Jar>("jar") {
    enabled = false
}

tasks.withType<Test> {
    useJUnitPlatform()
}
