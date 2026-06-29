package com.prologue.backend.auth.domain.model

import java.time.Instant

/**
 * 인증 신원을 나타내는 애그리거트 루트.
 *
 * 책임: "누가 로그인했는가"만 담당한다. 프로필·가치관 등 소개팅 도메인 정보는
 * 별도의 Member 컨텍스트가 담당하며 [id](AccountId)로 연결된다.
 *
 * 불변식:
 * - 한 계정은 최소 1개의 소셜 연결을 가진다.
 * - 같은 제공자(provider)는 계정당 한 번만 연결된다.
 * - ACTIVE 상태에서만 소셜 연결을 추가할 수 있다.
 *
 * 외부에서 직접 생성하지 못하도록 생성자를 막고, [register]/[reconstitute] 팩토리로만 만든다.
 */
class Account private constructor(
    val id: AccountId,
    initialConnections: List<SocialConnection>,
    status: AccountStatus,
    roles: Set<Role>,
    val createdAt: Instant,
) {
    private val _connections: MutableList<SocialConnection> = initialConnections.toMutableList()
    val connections: List<SocialConnection> get() = _connections.toList()

    var status: AccountStatus = status
        private set

    private val _roles: MutableSet<Role> = roles.toMutableSet()
    val roles: Set<Role> get() = _roles.toSet()

    /** 특정 소셜 연결을 보유하는지 확인. */
    fun hasConnection(provider: SocialProvider, providerUserId: String): Boolean =
        _connections.any { it.provider == provider && it.providerUserId == providerUserId }

    /** 이미 해당 제공자로 연결돼 있는지 확인. */
    fun isLinkedTo(provider: SocialProvider): Boolean =
        _connections.any { it.provider == provider }

    /**
     * 다른 소셜 제공자를 이 계정에 연결한다(계정 통합).
     * 같은 제공자가 이미 연결돼 있으면 멱등하게 무시한다.
     */
    fun linkSocial(connection: SocialConnection) {
        if (status != AccountStatus.ACTIVE) {
            throw AuthDomainException("활성 상태(ACTIVE) 계정만 소셜 연결을 추가할 수 있다 (현재: $status)")
        }
        if (isLinkedTo(connection.provider)) return
        _connections.add(connection)
    }

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
         * 소셜 로그인으로 신규 계정 등록.
         * @param connection 최초 소셜 연결
         * @param now 생성 시각(테스트 용이성을 위해 주입; 기본값 현재 시각)
         */
        fun register(connection: SocialConnection, now: Instant = Instant.now()): Account =
            Account(
                id = AccountId.newId(),
                initialConnections = listOf(connection),
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
            connections: List<SocialConnection>,
            status: AccountStatus,
            roles: Set<Role>,
            createdAt: Instant,
        ): Account = Account(id, connections, status, roles, createdAt)
    }
}
