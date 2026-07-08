package com.prologue.backend.auth.infrastructure.security

import com.prologue.backend.auth.application.port.CodeHasher
import org.springframework.stereotype.Component
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder as SpringBCrypt

/**
 * Spring Security BCrypt 기반 [CodeHasher] 구현.
 * 6자리 코드는 엔트로피가 낮지만, 짧은 만료·시도횟수 제한과 함께 느린 해시로
 * DB 유출 시 대량 역산을 방지한다.
 */
@Component
class BcryptCodeHasher : CodeHasher {
    private val delegate = SpringBCrypt()

    override fun hash(rawCode: String): String = requireNotNull(delegate.encode(rawCode))

    override fun matches(rawCode: String, hash: String): Boolean = delegate.matches(rawCode, hash)
}
