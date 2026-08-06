package com.prologue.backend.auth.infrastructure.jwt

import com.prologue.backend.auth.application.port.TokenProvider
import com.prologue.backend.auth.application.service.LastSeenService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Authorization: Bearer <accessToken> 를 검증해 SecurityContext에 인증을 주입한다.
 * principal = AccountId(string), authorities = ROLE_*. 토큰이 없거나 유효하지 않으면 그냥 통과(보호 자원은 이후 인가에서 거부).
 */
@Component
class JwtAuthenticationFilter(
    private val tokenProvider: TokenProvider,
    private val lastSeenService: LastSeenService,
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val header = request.getHeader(HttpHeaders.AUTHORIZATION)
        if (header != null && header.startsWith(BEARER_PREFIX) &&
            SecurityContextHolder.getContext().authentication == null
        ) {
            val token = header.substring(BEARER_PREFIX.length)
            tokenProvider.resolveAuthentication(token)?.let { principal ->
                val authorities = principal.roles.map { SimpleGrantedAuthority("ROLE_${it.name}") }
                val authentication = UsernamePasswordAuthenticationToken(
                    principal.accountId.toString(),
                    null,
                    authorities,
                )
                SecurityContextHolder.getContext().authentication = authentication
                // 최근 접속 기록 — 부가 기능이므로 실패해도 요청을 막지 않는다.
                runCatching { lastSeenService.touch(principal.accountId.value) }
            }
        }
        filterChain.doFilter(request, response)
    }

    companion object {
        private const val BEARER_PREFIX = "Bearer "
    }
}
