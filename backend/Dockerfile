# syntax=docker/dockerfile:1

# ── 1) Build stage ──────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Gradle wrapper + 빌드 스크립트 먼저 복사 → 의존성 캐시 레이어 활용
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies || true

# 소스 복사 후 실행 가능한 jar 빌드 (테스트는 CI에서, 배포 빌드에선 제외)
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ── 2) Runtime stage ────────────────────────────────────────────
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# 보안: non-root 사용자
RUN useradd -r -u 1001 spring
USER spring

COPY --from=build /app/build/libs/*.jar app.jar

# Render 무료 512MB에 맞춘 JVM 튜닝 (컨테이너 메모리의 75%를 힙으로)
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:TieredStopAtLevel=1"

# Render가 PORT 환경변수를 주입 → Spring이 그 포트로 뜨도록
ENV SERVER_PORT=${PORT}
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
