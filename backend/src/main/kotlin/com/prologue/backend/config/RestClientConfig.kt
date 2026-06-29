package com.prologue.backend.config

import org.springframework.beans.factory.config.ConfigurableBeanFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Scope
import org.springframework.web.client.RestClient

/**
 * RestClient.Builder 빈 제공.
 * Spring Boot 4.1 webmvc 환경에선 자동구성되지 않아 명시적으로 정의한다.
 * 프로토타입 스코프 → 주입 지점마다 새 빌더(제공자별 baseUrl이 서로 덮어쓰지 않도록).
 */
@Configuration
class RestClientConfig {

    @Bean
    @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
    fun restClientBuilder(): RestClient.Builder = RestClient.builder()
}
