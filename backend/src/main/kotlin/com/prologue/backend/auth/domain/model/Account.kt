package com.prologue.backend.auth.domain.model

import java.time.Instant

/**
 * 인증 신원을 나타내는 애그리거트 루트.
 *
 * 책임: "누가 로그인했는가"만 담당한다. 프로필·가치관 등 소개팅 도메인 정보는
 * 별도의 Member 컨텍스트가 담당하며 [id](AccountId)로 연결된다.
 *
 * 불변식:
 * - 한 계정은 정확히 하나의 이메일 자격증명([credential])을 가진다.
 * - [credential]의 email이 전 시스템에서 유일하다(중복 가입 불가 — 영속 계층 unique 제약으로 강제).
 *
 * 외부에서 직접 생성하지 못하도록 생성자를 막고, [register]/[reconstitute] 팩토리로만 만든다.
 */
class Account private constructor(
    /** 식별자. 영속(persist) 전에는 null이며, JPA가 저장 시점에 부여한다. */
    val id: AccountId?,
    val credential: EmailCredential,
    status: AccountStatus,
    roles: Set<Role>,
    val createdAt: Instant,
) {
    var status: AccountStatus = status
        private set

    private val _roles: MutableSet<Role> = roles.toMutableSet()
    val roles: Set<Role> get() = _roles.toSet()

    /** 로그인 식별자(정규화된 이메일). */
    val email: String get() = credential.email

    fun isActive(): Boolean = status == AccountStatus.ACTIVE

    /** 계정 정지(복구 가능). */
    fun suspend() {
        if (status == AccountStatus.WITHDRAWN) {
            throw AuthDomainException("탈퇴한 계정은 정지할 수 없다")
        }
        status = AccountStatus.SUSPENDED
    }

    /** 정지 해제. */
    fun reactivate() {
        if (status != AccountStatus.SUSPENDED) {
            throw AuthDomainException("정지 상태(SUSPENDED) 계정만 활성화할 수 있다 (현재: $status)")
        }
        status = AccountStatus.ACTIVE
    }

    /** 탈퇴(복구 불가). */
    fun withdraw() {
        status = AccountStatus.WITHDRAWN
    }

    companion object {
        /**
         * 이메일 가입으로 신규 계정 등록.
         * @param credential 이메일 + 해싱된 비밀번호
         * @param now 생성 시각(테스트 용이성을 위해 주입; 기본값 현재 시각)
         */
        fun register(credential: EmailCredential, now: Instant = Instant.now()): Account =
            Account(
                id = null, // 저장 시 JPA가 부여
                credential = credential,
                status = AccountStatus.ACTIVE,
                roles = setOf(Role.USER),
                createdAt = now,
            )

        /**
         * 영속 저장소에서 읽어온 데이터로 애그리거트를 재구성한다(인프라 계층 전용).
         * 도메인 불변식 검증 없이 기존 상태를 그대로 복원한다.
         */
        fun reconstitute(
            id: AccountId,
            credential: EmailCredential,
            status: AccountStatus,
            roles: Set<Role>,
            createdAt: Instant,
        ): Account = Account(id, credential, status, roles, createdAt)
    }
}
