package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
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

    /** 회차 묶음 — 같은 모임이 다시 열리면 같은 값. 단발 모임은 자기 혼자짜리 회차다. */
    @Column(name = "series_id", nullable = false)
    val seriesId: UUID,

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

    @Column(name = "place_url", length = 500)
    val placeUrl: String? = null,

    @Column(name = "place_address", length = 200)
    val placeAddress: String? = null,

    @Column(name = "capacity", nullable = false)
    val capacity: Int,

    /** 성별로 나눈 정원. 둘 다 null이면 나누지 않은 모임. */
    @Column(name = "capacity_male")
    val capacityMale: Int? = null,

    @Column(name = "capacity_female")
    val capacityFemale: Int? = null,

    /** 확정 대기(신청) 인원 상한. null이면 제한 없음. */
    @Column(name = "waitlist_capacity")
    val waitlistCapacity: Int? = null,

    @Column(name = "fee", nullable = false)
    val fee: Int,

    @Column(name = "fee_female")
    val feeFemale: Int? = null,

    @Column(name = "gender_limit", length = 6)
    val genderLimit: String? = null,

    @Column(name = "min_age_male")
    val minAgeMale: Int? = null,

    @Column(name = "max_age_male")
    val maxAgeMale: Int? = null,

    @Column(name = "min_age_female")
    val minAgeFemale: Int? = null,

    @Column(name = "max_age_female")
    val maxAgeFemale: Int? = null,

    @Column(name = "min_height_male_cm")
    val minHeightMaleCm: Int? = null,

    @Column(name = "min_height_female_cm")
    val minHeightFemaleCm: Int? = null,

    @Column(name = "require_job_verified", nullable = false)
    val requireJobVerified: Boolean = false,

    @Column(name = "emoji", length = 8)
    val emoji: String? = null,

    @Column(name = "color", length = 7)
    val color: String? = null,

    @Column(name = "cover_urls", columnDefinition = "text")
    val coverUrls: String? = null,

    /** 소개 글 안에 놓는 사진 — 쉼표로 이어 붙인다(커버와 같은 방식). */
    @Column(name = "body_image_urls", columnDefinition = "text")
    val bodyImageUrls: String? = null,

    @Column(name = "kakao_link", nullable = false, length = 300)
    val kakaoLink: String,

    @Column(name = "status", nullable = false, length = 12)
    var status: String = "OPEN",
    /** 반려 사유 — 모임장이 무엇을 고쳐야 하는지 알아야 한다. 승인되면 지운다. */
    @Column(name = "review_note", length = 300)
    var reviewNote: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,

    /** 후기 — 개최 완료 뒤에 모임장이 남기는 글. 소개와 같은 평문+표시 문법이다. */
    @Column(name = "recap", columnDefinition = "text")
    var recap: String? = null,

    /** 후기 사진 — 쉼표로 이어 붙인다(커버·소개 사진과 같은 방식). */
    @Column(name = "recap_image_urls", columnDefinition = "text")
    var recapImageUrls: String? = null,

    /** NONE|PENDING|APPROVED|REJECTED — 승인된 후기만 공개된다. 모임의 status와 따로 돈다. */
    @Column(name = "recap_status", nullable = false, length = 20)
    var recapStatus: String = "NONE",

    @Column(name = "recap_review_note", length = 300)
    var recapReviewNote: String? = null,

    /** 모임 소요 시간(분). null이면 정하지 않음 — 시작 시각만 보여준다. */
    @Column(name = "duration_minutes")
    val durationMinutes: Int? = null,
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

/**
 * 모임 따라가기 — (계정, 회차)가 곧 키다.
 * 같은 모임을 두 번 따라갈 수 없고, 따로 id를 둘 이유도 없다.
 */
@Embeddable
data class MeetupFollowId(
    @Column(name = "account_id", nullable = false)
    val accountId: UUID = UUID(0, 0),

    @Column(name = "series_id", nullable = false)
    val seriesId: UUID = UUID(0, 0),
) : java.io.Serializable

@Entity
@Table(name = "meetup_follows")
class MeetupFollowJpaEntity(
    @EmbeddedId
    val id: MeetupFollowId,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),
) {
    val accountId: UUID get() = id.accountId
    val seriesId: UUID get() = id.seriesId
}
