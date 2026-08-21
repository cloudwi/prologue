package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.UuidGenerator
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "meetups")
class MeetupJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "host_account_id", nullable = false)
    val hostAccountId: UUID,

    @Column(name = "title", nullable = false, length = 80)
    val title: String,

    @Column(name = "description", length = 1000)
    val description: String? = null,

    @Column(name = "meet_at", nullable = false)
    val meetAt: Instant,

    @Column(name = "place", nullable = false, length = 120)
    val place: String,

    @Column(name = "capacity", nullable = false)
    val capacity: Int,

    @Column(name = "fee", nullable = false)
    val fee: Int,

    @Column(name = "fee_female")
    val feeFemale: Int? = null,

    @Column(name = "gender_limit", length = 6)
    val genderLimit: String? = null,

    @Column(name = "min_age")
    val minAge: Int? = null,

    @Column(name = "max_age")
    val maxAge: Int? = null,

    @Column(name = "min_height_cm")
    val minHeightCm: Int? = null,

    @Column(name = "kakao_link", nullable = false, length = 300)
    val kakaoLink: String,

    @Column(name = "status", nullable = false, length = 12)
    var status: String = "OPEN",

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)

@Entity
@Table(
    name = "meetup_applications",
    uniqueConstraints = [UniqueConstraint(name = "uq_meetup_applicant", columnNames = ["meetup_id", "applicant_account_id"])],
)
class MeetupApplicationJpaEntity(
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID? = null,

    @Column(name = "meetup_id", nullable = false)
    val meetupId: UUID,

    @Column(name = "applicant_account_id", nullable = false)
    val applicantAccountId: UUID,

    @Column(name = "status", nullable = false, length = 12)
    var status: String = "APPLIED",

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant,
)
