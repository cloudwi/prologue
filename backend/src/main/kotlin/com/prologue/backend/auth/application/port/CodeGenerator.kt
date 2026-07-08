package com.prologue.backend.auth.application.port

/**
 * 인증코드 생성 아웃 포트(SPI). 6자리 숫자 코드를 안전한 난수로 생성한다.
 */
interface CodeGenerator {
    fun generate(): String
}
