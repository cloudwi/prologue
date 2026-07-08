package com.prologue.backend.auth.infrastructure.security

import com.prologue.backend.auth.application.port.CodeGenerator
import org.springframework.stereotype.Component
import java.security.SecureRandom

/**
 * SecureRandom 기반 6자리 숫자 코드 생성기. 000000~999999를 균등하게 뽑아 0 패딩.
 */
@Component
class SecureRandomCodeGenerator : CodeGenerator {
    private val random = SecureRandom()

    override fun generate(): String = "%06d".format(random.nextInt(1_000_000))
}
