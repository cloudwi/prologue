package com.prologue.backend.auth.domain.model

/**
 * 계정 생명주기 상태.
 * - [ACTIVE]: 정상 이용 가능
 * - [SUSPENDED]: 정지(로그인 차단, 복구 가능)
 * - [WITHDRAWN]: 탈퇴(복구 불가, 재가입은 새 계정)
 */
enum class AccountStatus {
    ACTIVE,
    SUSPENDED,
    WITHDRAWN,
}
