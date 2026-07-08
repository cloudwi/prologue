package com.prologue.backend.auth.application.port

/**
 * 인증코드 해싱 아웃 포트(SPI).
 *
 * 코드 원문을 저장하지 않기 위해 해싱한다 — DB 유출 시에도 코드가 노출되지 않도록.
 * 인프라 계층이 알고리즘(BCrypt 등)을 구현한다.
 */
interface CodeHasher {
    fun hash(rawCode: String): String

    fun matches(rawCode: String, hash: String): Boolean
}
