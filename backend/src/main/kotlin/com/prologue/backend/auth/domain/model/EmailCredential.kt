package com.prologue.backend.auth.domain.model

/**
 * 계정의 이메일 자격증명을 나타내는 값 객체(VO).
 *
 * - [email]: 로그인 식별자. 정규화(trim + 소문자)된 형태로만 보관한다 → 대소문자 차이로 인한 중복 가입 방지.
 * - [passwordHash]: BCrypt 등으로 해싱된 비밀번호. 평문은 절대 도메인에 들어오지 않는다.
 *
 * [email]이 전 시스템에서 한 계정을 가리키는 자연키 역할을 한다.
 */
data class EmailCredential(
    val email: String,
    val passwordHash: String,
) {
    init {
        require(email.isNotBlank()) { "email은 비어 있을 수 없다" }
        require(email == normalizeEmail(email)) { "email은 정규화된 형태여야 한다" }
        require(passwordHash.isNotBlank()) { "passwordHash는 비어 있을 수 없다" }
    }

    companion object {
        /** 이메일 정규화: 앞뒤 공백 제거 + 소문자화. 조회/저장 양쪽에서 동일하게 사용한다. */
        fun normalizeEmail(raw: String): String = raw.trim().lowercase()
    }
}
