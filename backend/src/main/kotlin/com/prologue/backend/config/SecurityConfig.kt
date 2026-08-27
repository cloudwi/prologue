package com.prologue.backend.config

import com.prologue.backend.auth.infrastructure.jwt.JwtAuthenticationFilter
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
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
 *         앱 부팅 설정(app-config) — 로그인 전에 최소 지원 버전을 확인해야 한다,
 *         모임 초대장 페이지(/m/{id}) — 카카오톡에 붙은 링크와 미리보기 크롤러가 읽는다(회원이 아니다)
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
            /*
             * 프레임 삽입은 같은 출처에만 허용한다.
             *
             * 스프링 기본값은 DENY다 — 클릭재킹을 막으려고 어떤 페이지에서도 iframe에 못 들어가게 한다.
             * 그런데 모임장 콘솔(prologue.day/host)은 오른쪽 폰 화면에 진짜 초대장(prologue.day/m/{id})을
             * 그대로 끼워 보여준다. 흉내낸 그림이 아니라 참여자가 보는 바로 그 페이지여야 의미가 있어서다.
             * 둘은 같은 출처라 SAMEORIGIN이면 그 화면만 살아나고, 남의 사이트가 우리 페이지를 덮어씌우는
             * 길은 그대로 닫혀 있다.
             */
            .headers { headers -> headers.frameOptions { it.sameOrigin() } }
            .authorizeHttpRequests {
                // /error를 열어두는 건 편의가 아니라 정확성 문제다. 없는 주소로 404가 나면 스프링은
                // /error로 포워드하는데, 그 디스패치에서는 JWT 필터가 다시 돌지 않는다(OncePerRequestFilter
                // 기본 동작). 인증이 비어 있으니 여기서 막히고, 클라이언트는 404 대신 403을 받는다.
                // 앱은 403을 세션 만료로 읽어 토큰을 지우므로, 오타 하나가 "로그아웃"으로 둔갑한다.
                it.requestMatchers("/error").permitAll()
                it.requestMatchers("/auth/**", "/actuator/health", "/app-config").permitAll()
                it.requestMatchers("/m/*").permitAll()
                // 모임 목록·지난 모임은 가입 전에도 읽힌다. 읽기만이고, 손드는 건 여전히 회원의 일이다.
                // 참가자 프로필(/meetups/members/*)은 열지 않는다 — 사진과 나이는 아무나 볼 것이 아니다.
                it.requestMatchers(HttpMethod.GET, "/meetups", "/meetups/history").permitAll()
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
            // PUT은 어드민의 질문 수정이 쓴다 — 빠져 있으면 프리플라이트에서 조용히 막힌다.
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type")
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/**", config) }
    }
}
