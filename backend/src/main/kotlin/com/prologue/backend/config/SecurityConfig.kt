package com.prologue.backend.config

import com.prologue.backend.auth.infrastructure.jwt.JwtAuthenticationFilter
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

/**
 * REST API 보안 설정.
 * - 무상태(JWT 기반, 세션 미사용), CSRF/폼로그인/기본인증 비활성
 * - 공개: 이메일 가입/로그인 경로(auth 하위), 헬스체크(actuator health) — Render·UptimeRobot,
 *         앱 부팅 설정(app-config) — 로그인 전에 최소 지원 버전을 확인해야 한다
 * - 어드민(admin 하위 경로): ROLE_ADMIN만 — 웹 어드민 페이지가 쓴다
 * - 그 외: 인증 필요
 * - CORS: 웹 어드민(브라우저)의 API 호출을 위해 웹 출처만 허용 — 앱은 네이티브라 해당 없음
 */
@Configuration
@EnableWebSecurity
class SecurityConfig(
    @param:Value("\${cors.allowed-origins:https://prologue.day,https://www.prologue.day,https://prologue-web.onrender.com,http://localhost:4321}")
    private val allowedOrigins: List<String>,
) {

    @Bean
    fun filterChain(http: HttpSecurity, jwtAuthenticationFilter: JwtAuthenticationFilter): SecurityFilterChain {
        http
            .cors { }
            .csrf { it.disable() }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers("/auth/**", "/actuator/health", "/app-config").permitAll()
                it.requestMatchers("/admin/**").hasRole("ADMIN")
                it.anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)
        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOrigins = this@SecurityConfig.allowedOrigins
            allowedMethods = listOf("GET", "POST", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type")
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/**", config) }
    }
}
