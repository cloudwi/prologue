package com.prologue.backend.member.domain.model

import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId
import java.util.UUID

/**
 * 소개팅 프로필 애그리거트 루트.
 * 인증(Account)과 1:1로 대응하며 [accountId]로 연결된다. (auth 컨텍스트와는 ID 참조로만 결합)
 *
 * 필수: 닉네임 · 성별 · 생년월일 · 선호 성별 · 지역.
 * 선택(프로필 풍부화): 자기소개 · 키 · 체형 · 취미/관심사/장점 키워드.
 */
class Member private constructor(
    val accountId: UUID,
    nickname: String,
    gender: Gender,
    birthDate: LocalDate,
    preferredGender: Gender,
    region: String,
    val createdAt: Instant,
    bio: String?,
    heightCm: Int?,
    bodyType: BodyType?,
    hobbies: List<String>,
    interests: List<String>,
    strengths: List<String>,
    avatarId: Int?,
    photoUrl: String?,
) {
    var nickname: String = nickname
        private set
    var gender: Gender = gender
        private set
    var birthDate: LocalDate = birthDate
        private set
    var preferredGender: Gender = preferredGender
        private set
    var region: String = region
        private set
    var bio: String? = bio
        private set
    var heightCm: Int? = heightCm
        private set
    var bodyType: BodyType? = bodyType
        private set
    var hobbies: List<String> = hobbies
        private set
    var interests: List<String> = interests
        private set
    var strengths: List<String> = strengths
        private set
    var avatarId: Int? = avatarId
        private set

    /** 대표 프로필 사진 URL. 온보딩 본문과 별개로 전용 업로드 엔드포인트에서 갱신된다. */
    var photoUrl: String? = photoUrl
        private set

    /** 사진 업로드/삭제 시 갱신(전용 엔드포인트). null이면 사진 없음. */
    fun updatePhoto(photoUrl: String?) {
        this.photoUrl = photoUrl?.trim()?.ifBlank { null }
    }

    /** 만 나이. 상대에게는 생년월일 원본 대신 이 값만 노출한다. */
    fun age(today: LocalDate = LocalDate.now(KST)): Int = Period.between(birthDate, today).years

    /** 프로필 수정(재온보딩/편집). 사진은 별도 관리라 여기서 건드리지 않는다. */
    fun updateProfile(
        nickname: String,
        gender: Gender,
        birthDate: LocalDate,
        preferredGender: Gender,
        region: String,
        bio: String? = null,
        heightCm: Int? = null,
        bodyType: BodyType? = null,
        hobbies: List<String> = emptyList(),
        interests: List<String> = emptyList(),
        strengths: List<String> = emptyList(),
        avatarId: Int? = null,
    ) {
        validate(nickname, birthDate, region, bio, heightCm, avatarId)
        this.nickname = nickname.trim()
        this.gender = gender
        this.birthDate = birthDate
        this.preferredGender = preferredGender
        this.region = region.trim()
        this.bio = bio?.trim()?.ifBlank { null }
        this.heightCm = heightCm
        this.bodyType = bodyType
        this.hobbies = normalizeKeywords(hobbies)
        this.interests = normalizeKeywords(interests)
        this.strengths = normalizeKeywords(strengths)
        this.avatarId = avatarId
    }

    companion object {
        private const val NICKNAME_MAX = 30
        private const val MIN_BIRTH_YEAR = 1920
        private const val BIO_MAX = 100
        private const val KEYWORD_MAX = 15
        private val KST = ZoneId.of("Asia/Seoul")

        fun register(
            accountId: UUID,
            nickname: String,
            gender: Gender,
            birthDate: LocalDate,
            preferredGender: Gender,
            region: String,
            bio: String? = null,
            heightCm: Int? = null,
            bodyType: BodyType? = null,
            hobbies: List<String> = emptyList(),
            interests: List<String> = emptyList(),
            strengths: List<String> = emptyList(),
            avatarId: Int? = null,
            now: Instant = Instant.now(),
        ): Member {
            validate(nickname, birthDate, region, bio, heightCm, avatarId, now)
            return Member(
                accountId, nickname.trim(), gender, birthDate, preferredGender, region.trim(), now,
                bio?.trim()?.ifBlank { null }, heightCm, bodyType,
                normalizeKeywords(hobbies), normalizeKeywords(interests), normalizeKeywords(strengths), avatarId,
                photoUrl = null, // 신규 회원은 사진 없음(가입 후 업로드)
            )
        }

        /** 영속 저장소에서 복원(인프라 전용, 검증 생략). */
        fun reconstitute(
            accountId: UUID,
            nickname: String,
            gender: Gender,
            birthDate: LocalDate,
            preferredGender: Gender,
            region: String,
            createdAt: Instant,
            bio: String? = null,
            heightCm: Int? = null,
            bodyType: BodyType? = null,
            hobbies: List<String> = emptyList(),
            interests: List<String> = emptyList(),
            strengths: List<String> = emptyList(),
            avatarId: Int? = null,
            photoUrl: String? = null,
        ): Member = Member(
            accountId, nickname, gender, birthDate, preferredGender, region, createdAt,
            bio, heightCm, bodyType, hobbies, interests, strengths, avatarId, photoUrl,
        )

        private fun normalizeKeywords(keywords: List<String>): List<String> =
            keywords.map { it.trim() }.filter { it.isNotBlank() }.distinct().take(KEYWORD_MAX)

        private fun validate(nickname: String, birthDate: LocalDate, region: String, bio: String?, heightCm: Int?, avatarId: Int?, now: Instant = Instant.now()) {
            if (avatarId != null && (avatarId < 1 || avatarId > 4)) throw MemberDomainException("아바타가 올바르지 않습니다")
            if (nickname.isBlank()) throw MemberDomainException("닉네임은 필수입니다")
            if (nickname.trim().length > NICKNAME_MAX) {
                throw MemberDomainException("닉네임은 ${NICKNAME_MAX}자 이하여야 합니다")
            }
            val today = now.atZone(KST).toLocalDate()
            if (birthDate.year < MIN_BIRTH_YEAR || birthDate.isAfter(today)) {
                throw MemberDomainException("생년월일이 올바르지 않습니다")
            }
            if (region.isBlank()) throw MemberDomainException("지역은 필수입니다")
            if (bio != null && bio.trim().length > BIO_MAX) throw MemberDomainException("자기소개는 ${BIO_MAX}자 이하여야 합니다")
            if (heightCm != null && (heightCm < 120 || heightCm > 230)) throw MemberDomainException("키가 올바르지 않습니다")
        }
    }
}
