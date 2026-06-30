package com.prologue.backend.member.infrastructure.persistence

import com.prologue.backend.member.domain.model.Gender
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** members 테이블 매핑. account_id를 PK로 사용(계정과 1:1, 외부에서 부여). */
@Entity
@Table(name = "members")
class MemberJpaEntity(
    @Id
    @Column(name = "account_id", nullable = false, updatable = false)
    val accountId: UUID,

    @Column(name = "nickname", nullable = false, length = 30)
    var nickname: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 10)
    var gender: Gender,

    @Column(name = "birth_year", nullable = false)
    var birthYear: Int,

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_gender", nullable = false, length = 10)
    var preferredGender: Gender,

    @Column(name = "region", nullable = false, length = 50)
    var region: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
