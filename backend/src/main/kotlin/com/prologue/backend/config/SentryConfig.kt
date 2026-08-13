package com.prologue.backend.config

import io.sentry.Sentry
import jakarta.annotation.PostConstruct
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration

/**
 * 에러 모니터링 초기화.
 *
 * 유저가 겪는 500을 유저의 제보보다 먼저 알기 위한 장치다 — 로그인 팅김도 사용자가
 * 직접 겪고서야 알았다. DSN이 없으면 아무것도 하지 않으므로 로컬·테스트에 무해하다.
 *
 * 스프링 스타터 대신 직접 초기화하는 이유: 스타터는 Boot 3 전용이라 Boot 4에서
 * 컨텍스트를 죽인다. 여기서 전역 SDK만 켜두면, logback 어펜더(logback-spring.xml)가
 * ERROR 로그를 이벤트로 보낸다 — 처리되지 않은 예외는 스프링이 ERROR로 남기므로
 * 웹 계층 연동 없이도 500이 전부 잡힌다.
 */
@Configuration
class SentryConfig(
    @param:Value("\${sentry.dsn:}") private val dsn: String,
) {
    @PostConstruct
    fun init() {
        if (dsn.isBlank()) return
        Sentry.init { options ->
            options.dsn = dsn
            // 소개팅 앱 — 에러 리포트에 개인정보(IP·쿠키 등)를 싣지 않는다
            options.isSendDefaultPii = false
        }
    }
}
