package com.prologue.backend.auth.application.port

/**
 * 비밀번호 해싱 아웃 포트(SPI).
 *
 * 도메인/애플리케이션은 해싱 알고리즘(BCrypt 등)을 모른다 — 인프라 계층이 구현한다.
 */
interface PasswordEncoder {
    /** 평문 비밀번호를 해싱한다. */
    fun encode(raw: String): String

    /** 평문 비밀번호가 저장된 해시와 일치하는지 검증한다. */
    fun matches(raw: String, hash: String): Boolean
}
