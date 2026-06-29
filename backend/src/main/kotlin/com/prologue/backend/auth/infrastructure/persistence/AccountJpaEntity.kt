package com.prologue.backend.auth.infrastructure.persistence

import com.prologue.backend.auth.domain.model.AccountStatus
import com.prologue.backend.auth.domain.model.Role
import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * accounts 애그리거트의 JPA 영속 표현. 도메인 모델과 분리돼 있으며 어댑터가 상호 변환한다.
 * 무인자 생성자는 kotlin("plugin.jpa")가 생성한다.
 */
@Entity
@Table(name = "accounts")
class AccountJpaEntity(
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    val id: UUID,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    var status: AccountStatus,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "account_social_connections",
        joinColumns = [JoinColumn(name = "account_id")],
    )
    val connections: MutableSet<SocialConnectionEmbeddable> = mutableSetOf(),

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "account_roles",
        joinColumns = [JoinColumn(name = "account_id")],
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    val roles: MutableSet<Role> = mutableSetOf(),
)
