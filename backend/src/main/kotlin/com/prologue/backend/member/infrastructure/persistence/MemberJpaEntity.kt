package com.prologue.backend.member.infrastructure.persistence

import com.prologue.backend.member.domain.model.BodyType
import com.prologue.backend.member.domain.model.Gender
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate
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

    @Column(name = "birth_date", nullable = false)
    var birthDate: LocalDate,

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_gender", length = 10)
    var preferredGender: Gender?,

    @Column(name = "region", nullable = false, length = 50)
    var region: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,

    @Column(name = "bio", length = 200)
    var bio: String? = null,

    @Column(name = "height_cm")
    var heightCm: Int? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "body_type", length = 10)
    var bodyType: BodyType? = null,

    // 키워드는 콤마 구분 문자열로 저장(도메인에서는 List<String>)
    @Column(name = "hobbies", length = 500)
    var hobbies: String? = null,

    @Column(name = "interests", length = 500)
    var interests: String? = null,

    @Column(name = "strengths", length = 500)
    var strengths: String? = null,

    @Column(name = "avatar_id")
    var avatarId: Int? = null,

    /** 사진 공개 URL 목록(콤마 조인, 등록 순). 최대 6장. */
    @Column(name = "photo_urls", columnDefinition = "text")
    var photoUrls: String? = null,

    /** 전화번호(숫자만). 신규 가입은 필수 — 이전 회원 행만 null. */
    @Column(name = "phone", length = 20)
    var phone: String? = null,

    @Column(name = "kakao_id", length = 30)
    var kakaoId: String? = null,
)
