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
 * 필수: 닉네임 · 성별 · 생년월일 · 선호 성별 · 지역 · 전화번호(신규 가입부터).
 * 선택(프로필 풍부화): 자기소개 · 키 · 체형 · 취미/관심사/장점 키워드 · 카카오톡 ID.
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
    photoUrls: List<String>,
    phone: String?,
    kakaoId: String?,
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

    /** 전화번호(숫자만 저장). 편지에 실어 보내는 연락처 — 신규 가입은 필수, 이전 회원만 null일 수 있다. */
    var phone: String? = phone
        private set

    /** 카카오톡 ID(선택). 편지에 전화번호 대신 실을 수 있다. */
    var kakaoId: String? = kakaoId
        private set

    /** 프로필 사진 URL 목록(등록 순 = 노출 순). 최대 [MAX_PHOTOS]장, 전용 업로드 엔드포인트에서 갱신된다. */
    var photoUrls: List<String> = photoUrls
        private set

    /**
     * 소개 노출 조건. 사진이 [MIN_PHOTOS]장 이상이어야 상대에게 소개된다.
     *
     * 가입 시점에는 사진을 올릴 수 없으므로(회원이 있어야 업로드 가능) 최소 장수를
     * 가입 조건으로 걸 수 없다. 대신 계정은 만들되 사진을 채우기 전까지 소개되지 않는다.
     * TODO: 매칭·발견 쿼리에 이 조건을 반영할 것. 현재는 클라이언트 온보딩에서만 2장을 요구한다.
     */
    fun isVisibleToOthers(): Boolean = photoUrls.size >= MIN_PHOTOS

    /** 사진 추가(전용 엔드포인트). 최대 [MAX_PHOTOS]장. */
    fun addPhoto(url: String) {
        if (photoUrls.size >= MAX_PHOTOS) throw MemberDomainException("사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있어요")
        photoUrls = photoUrls + url
    }

    /** 사진 삭제. 목록에 없으면 무시(멱등). */
    fun removePhoto(url: String) {
        photoUrls = photoUrls - url
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
        phone: String,
        bio: String? = null,
        heightCm: Int? = null,
        bodyType: BodyType? = null,
        hobbies: List<String> = emptyList(),
        interests: List<String> = emptyList(),
        strengths: List<String> = emptyList(),
        avatarId: Int? = null,
        kakaoId: String? = null,
    ) {
        validate(nickname, birthDate, region, bio, heightCm, avatarId)
        this.nickname = nickname.trim()
        this.gender = gender
        this.birthDate = birthDate
        this.preferredGender = preferredGender
        this.region = region.trim()
        this.phone = normalizePhone(phone)
        this.kakaoId = normalizeKakaoId(kakaoId)
        this.bio = bio?.trim()?.ifBlank { null }
        this.heightCm = heightCm
        this.bodyType = bodyType
        this.hobbies = normalizeKeywords(hobbies)
        this.interests = normalizeKeywords(interests)
        this.strengths = normalizeKeywords(strengths)
        this.avatarId = avatarId
    }

    companion object {
        /** 프로필 사진 필수/최대 장수. 최소 장수는 앱 온보딩에서 강제된다(사진은 가입 후 업로드라서). */
        const val MIN_PHOTOS = 2
        const val MAX_PHOTOS = 6

        private const val NICKNAME_MAX = 30
        private const val MIN_BIRTH_YEAR = 1920
        /** 가입 가능한 최소 만 나이 — 한국 성년(만 19세). */
        private const val ADULT_AGE = 19
        private const val BIO_MAX = 100
        private const val KEYWORD_MAX = 15
        private const val KAKAO_ID_MAX = 30
        private val KST = ZoneId.of("Asia/Seoul")

        fun register(
            accountId: UUID,
            nickname: String,
            gender: Gender,
            birthDate: LocalDate,
            preferredGender: Gender,
            region: String,
            phone: String,
            bio: String? = null,
            heightCm: Int? = null,
            bodyType: BodyType? = null,
            hobbies: List<String> = emptyList(),
            interests: List<String> = emptyList(),
            strengths: List<String> = emptyList(),
            avatarId: Int? = null,
            kakaoId: String? = null,
            photoUrls: List<String> = emptyList(),
            now: Instant = Instant.now(),
        ): Member {
            validate(nickname, birthDate, region, bio, heightCm, avatarId, now)
            // 사진은 회원이 생긴 뒤에야 업로드할 수 있으므로(POST /members/me/photos)
            // 가입 시점에 최소 장수를 요구하면 프로필도 사진도 만들 수 없는 교착이 된다.
            // "최소 ${MIN_PHOTOS}장"은 가입 조건이 아니라 소개 노출 조건으로 다룬다(isVisibleToOthers).
            if (photoUrls.size > MAX_PHOTOS) {
                throw MemberDomainException("사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있어요")
            }
            return Member(
                accountId, nickname.trim(), gender, birthDate, preferredGender, region.trim(), now,
                bio?.trim()?.ifBlank { null }, heightCm, bodyType,
                normalizeKeywords(hobbies), normalizeKeywords(interests), normalizeKeywords(strengths), avatarId,
                photoUrls = photoUrls,
                phone = normalizePhone(phone),
                kakaoId = normalizeKakaoId(kakaoId),
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
            photoUrls: List<String> = emptyList(),
            phone: String? = null,
            kakaoId: String? = null,
        ): Member = Member(
            accountId, nickname, gender, birthDate, preferredGender, region, createdAt,
            bio, heightCm, bodyType, hobbies, interests, strengths, avatarId, photoUrls,
            phone, kakaoId,
        )

        private fun normalizeKeywords(keywords: List<String>): List<String> =
            keywords.map { it.trim() }.filter { it.isNotBlank() }.distinct().take(KEYWORD_MAX)

        /** 하이픈·공백을 걷어내고 숫자만 남긴다. 휴대폰 번호(01x) 형태만 허용. */
        private fun normalizePhone(phone: String): String {
            val digits = phone.filter { it.isDigit() }
            if (!digits.matches(Regex("^01[016789]\\d{7,8}$"))) {
                throw MemberDomainException("전화번호가 올바르지 않습니다")
            }
            return digits
        }

        private fun normalizeKakaoId(kakaoId: String?): String? {
            val trimmed = kakaoId?.trim()?.ifBlank { null } ?: return null
            if (trimmed.length > KAKAO_ID_MAX) throw MemberDomainException("카카오톡 ID는 ${KAKAO_ID_MAX}자 이하여야 합니다")
            return trimmed
        }

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
            // 소개팅 서비스는 성인 전용 — 만 19세(한국 성년) 미만은 가입할 수 없다.
            if (birthDate.plusYears(ADULT_AGE.toLong()).isAfter(today)) {
                throw MemberDomainException("만 ${ADULT_AGE}세 이상만 가입할 수 있습니다")
            }
            if (region.isBlank()) throw MemberDomainException("지역은 필수입니다")
            if (bio != null && bio.trim().length > BIO_MAX) throw MemberDomainException("자기소개는 ${BIO_MAX}자 이하여야 합니다")
            if (heightCm != null && (heightCm < 120 || heightCm > 230)) throw MemberDomainException("키가 올바르지 않습니다")
        }
    }
}
