package com.prologue.backend.auth.domain.model

import java.util.UUID

/**
 * Account 애그리거트의 식별자 값 객체(VO).
 * 원시 UUID를 그대로 노출하지 않고 타입으로 감싸 도메인 의미를 부여한다.
 */
@JvmInline
value class AccountId(val value: UUID) {
    companion object {
        fun from(value: String): AccountId = AccountId(UUID.fromString(value))
    }

    override fun toString(): String = value.toString()
}
