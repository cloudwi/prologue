package com.prologue.backend.auth.infrastructure.security

import com.prologue.backend.auth.application.port.PasswordEncoder
import org.springframework.stereotype.Component
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder as SpringBCrypt

/**
 * Spring Security BCrypt 기반 [PasswordEncoder] 구현.
 * 솔트는 해시 문자열에 내장되므로 별도 저장이 필요 없다.
 */
@Component
class BcryptPasswordEncoder : PasswordEncoder {
    private val delegate = SpringBCrypt()

    override fun encode(raw: String): String = requireNotNull(delegate.encode(raw))

    override fun matches(raw: String, hash: String): Boolean = delegate.matches(raw, hash)
}
