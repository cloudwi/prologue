package com.prologue.backend.auth.domain.model

/**
 * 계정 권한.
 * - [USER]: 일반 사용자
 * - [HOST]: 모임장 — 웹 /host에서 오프라인 모임을 만들고 신청자를 확정한다. 운영자가 지정한다.
 * - [ADMIN]: 운영자
 *
 * 참고: "공식계정"은 인증(Account)이 아닌 회원(Member) 컨텍스트의 개념으로 다룬다.
 */
enum class Role {
    USER,
    HOST,
    ADMIN,
}
