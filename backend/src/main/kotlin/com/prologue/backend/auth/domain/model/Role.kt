package com.prologue.backend.auth.domain.model

/**
 * 계정 권한.
 * - [USER]: 일반 사용자
 * - [ADMIN]: 운영자
 *
 * 모임장은 롤이 아니다 — 누구나 앱에서 모임을 열 수 있고, 소유권은 모임 행이 말한다(V38에서 HOST 폐기).
 * 참고: "공식계정"은 인증(Account)이 아닌 회원(Member) 컨텍스트의 개념으로 다룬다.
 */
enum class Role {
    USER,
    ADMIN,
}
