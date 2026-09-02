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
    preferredGender: Gender?,
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
    minAge: Int?,
    maxAge: Int?,
    religion: Religion?,
    politicalLeaning: PoliticalLeaning?,
) {
    var nickname: String = nickname
        private set
    var gender: Gender = gender
        private set
    var birthDate: LocalDate = birthDate
        private set
    var preferredGender: Gender? = preferredGender
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

    /**
     * 소개받고 싶은 나이대. 둘 다 비어 있으면 상관없다는 뜻이고, 한쪽만 채우면 그쪽만 조인다.
     *
     * 나이는 [PeerScore]에서 이미 점수로 쓰이지만 그건 순서의 문제다. 본인이 정한 범위는
     * 자격의 문제라 [PeerEligibility]가 본다 — 순서를 미루는 것과 아예 소개하지 않는 것은 다르다.
     */
    var minAge: Int? = minAge
        private set
    var maxAge: Int? = maxAge
        private set

    /** 전화번호(숫자만 저장). 편지에 실어 보내는 연락처 — 신규 가입은 필수, 이전 회원만 null일 수 있다. */
    var phone: String? = phone
        private set

    /** 카카오톡 ID(선택). 편지에 전화번호 대신 실을 수 있다. */
    var kakaoId: String? = kakaoId
        private set

    /**
     * 종교·정치 성향 — 민감정보라 다른 선택 항목과 다르게 다룬다([Religion], [PoliticalLeaning]).
     *
     * **[updateProfile]이 건드리지 않는다.** 프로필 저장은 전체 덮어쓰기라, 이 필드를 거기 끼우면
     * 이 항목을 모르는 옛 앱이 프로필을 한 번 저장할 때마다 조용히 지워버린다. 동의를 받고 적은
     * 값이 그렇게 사라지면 안 된다 — 오직 [updateBeliefs]로만 바뀐다.
     */
    var religion: Religion? = religion
        private set
    var politicalLeaning: PoliticalLeaning? = politicalLeaning
        private set

    /**
     * 종교·정치 성향을 적거나 지운다. 둘 다 null이면 지우는 것이고, 지우는 데는 동의가 필요 없다.
     * (동의 확인은 응용 계층의 일이다 — 도메인은 무엇이 민감한지만 알고, 누가 동의했는지는 모른다.)
     */
    fun updateBeliefs(religion: Religion?, politicalLeaning: PoliticalLeaning?) {
        this.religion = religion
        this.politicalLeaning = politicalLeaning
    }

    /** 하나라도 적혀 있는지 — 동의가 필요한 상태인지 판단할 때 쓴다. */
    fun hasBeliefs(): Boolean = religion != null || politicalLeaning != null

    /** 프로필 사진 URL 목록(등록 순 = 노출 순). 최대 [MAX_PHOTOS]장, 전용 업로드 엔드포인트에서 갱신된다. */
    var photoUrls: List<String> = photoUrls
        private set

    /**
     * 소개 노출 조건. 사진이 [MIN_PHOTOS]장 이상이어야 상대에게 소개된다.
     *
     * 가입 시점에는 사진을 올릴 수 없으므로(회원이 있어야 업로드 가능) 최소 장수를
     * 가입 조건으로 걸 수 없다. 대신 계정은 만들되 사진을 채우기 전까지 소개되지 않는다.
     * 온보딩(클라이언트)이 [MIN_PHOTOS]장을 요구하고, 한번 채운 뒤에는 [removePhoto]가
     * 그 밑으로 내려가지 못하게 막는다 — 두 장치가 합쳐져 "보이는 회원은 항상 2장 이상"이 된다.
     * TODO: 매칭·발견 쿼리에 이 조건을 반영할 것.
     */
    fun isVisibleToOthers(): Boolean = photoUrls.size >= MIN_PHOTOS

    /** 사진 추가(전용 엔드포인트). 최대 [MAX_PHOTOS]장. */
    fun addPhoto(url: String) {
        if (photoUrls.size >= MAX_PHOTOS) throw MemberDomainException("사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있어요")
        photoUrls = photoUrls + url
    }

    /**
     * 사진 삭제(본인). 목록에 없으면 무시(멱등).
     * [MIN_PHOTOS]장을 채운 뒤에는 그 밑으로 내려갈 수 없다 — 교체는 새 사진을 먼저 올린 뒤 지우는 순서.
     * 아직 못 채운 계정(온보딩 중단 등)은 자유롭게 지운다 — 바닥은 한번 밟은 사람에게만 생긴다.
     */
    fun removePhoto(url: String) {
        if (url !in photoUrls) return
        if (photoUrls.size == MIN_PHOTOS) {
            throw MemberDomainException("프로필 사진은 ${MIN_PHOTOS}장 이상 유지해야 해요. 새 사진을 먼저 올린 뒤 지워주세요")
        }
        photoUrls = photoUrls - url
    }

    /**
     * 검수 삭제(운영자). 부적절한 사진은 최소 장수와 무관하게 내린다.
     * 장수가 모자라져 소개 노출이 멈추는 것([isVisibleToOthers])이 의도된 결과다.
     */
    fun stripPhoto(url: String) {
        photoUrls = photoUrls - url
    }

    /** 만 나이. 상대에게는 생년월일 원본 대신 이 값만 노출한다. */
    fun age(today: LocalDate = LocalDate.now(KST)): Int = Period.between(birthDate, today).years

    /** 프로필 수정(재온보딩/편집). 사진은 별도 관리라 여기서 건드리지 않는다. */
    fun updateProfile(
        nickname: String,
        gender: Gender,
        birthDate: LocalDate,
        preferredGender: Gender?,
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
        minAge: Int? = null,
        maxAge: Int? = null,
    ) {
        validate(nickname, birthDate, region, bio, heightCm, avatarId)
        validateAgeRange(minAge, maxAge)
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
        this.minAge = minAge
        this.maxAge = maxAge
    }

    companion object {
        /** 프로필 사진 필수/최대 장수. 최소 장수는 앱 온보딩에서 강제된다(사진은 가입 후 업로드라서). */
        const val MIN_PHOTOS = 2
        const val MAX_PHOTOS = 6

        private const val NICKNAME_MAX = 30
        private const val MIN_BIRTH_YEAR = 1920
        /** 가입 가능한 최소 만 나이 — 한국 성년(만 19세). */
        private const val ADULT_AGE = 19

        /** 나이대의 상한 — 이 위로는 사실상 "상관없음"과 같아서 굳이 나누지 않는다. */
        private const val AGE_MAX = 99
        private const val BIO_MAX = 500

        /**
         * 자기소개의 최소 분량 — 쓰기로 했다면 인사 한 문단은 되도록.
         * 자기소개 자체는 건너뛸 수 있다(null 허용) — 하한은 "쓴 글"에만 적용된다.
         * 프로필을 연 상대가 가장 먼저 읽는 글이라, "안녕하세요" 한 마디가 걸려 있으면
         * 프로필 전체가 성의 없어 보인다.
         */
        private const val BIO_MIN = 20
        private const val KEYWORD_MAX = 15
        private const val KAKAO_ID_MAX = 30
        private val KST = ZoneId.of("Asia/Seoul")

        fun register(
            accountId: UUID,
            nickname: String,
            gender: Gender,
            birthDate: LocalDate,
            preferredGender: Gender?,
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
            minAge: Int? = null,
            maxAge: Int? = null,
            now: Instant = Instant.now(),
        ): Member {
            validate(nickname, birthDate, region, bio, heightCm, avatarId, now)
            validateAgeRange(minAge, maxAge)
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
                minAge = minAge,
                maxAge = maxAge,
                // 가입에서는 묻지 않는다 — 민감정보는 별도 동의와 함께 나중에(updateBeliefs).
                religion = null,
                politicalLeaning = null,
            )
        }

        /** 영속 저장소에서 복원(인프라 전용, 검증 생략). */
        fun reconstitute(
            accountId: UUID,
            nickname: String,
            gender: Gender,
            birthDate: LocalDate,
            preferredGender: Gender?,
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
            minAge: Int? = null,
            maxAge: Int? = null,
            religion: Religion? = null,
            politicalLeaning: PoliticalLeaning? = null,
        ): Member = Member(
            accountId, nickname, gender, birthDate, preferredGender, region, createdAt,
            bio, heightCm, bodyType, hobbies, interests, strengths, avatarId, photoUrls,
            phone, kakaoId, minAge, maxAge, religion, politicalLeaning,
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
            if (bio != null && bio.isNotBlank() && bio.trim().length < BIO_MIN) {
                throw MemberDomainException("자기소개는 ${BIO_MIN}자 이상 적어주세요 — 비워둘 수는 있어요")
            }
            if (heightCm != null && (heightCm < 120 || heightCm > 230)) throw MemberDomainException("키가 올바르지 않습니다")
        }

        /**
         * 소개받고 싶은 나이대. 비우는 것은 자유이고, 채운다면 말이 되는 범위여야 한다.
         *
         * 하한을 성년(만 19세)으로 두는 것은 취향의 문제가 아니다 — 그보다 어린 회원은 존재하지
         * 않으므로, 더 낮게 적으면 지키지도 못할 약속을 화면에 적어두는 꼴이 된다.
         */
        private fun validateAgeRange(minAge: Int?, maxAge: Int?) {
            listOfNotNull(minAge, maxAge).forEach {
                if (it < ADULT_AGE || it > AGE_MAX) {
                    throw MemberDomainException("나이대는 ${ADULT_AGE}세부터 ${AGE_MAX}세까지 정할 수 있어요")
                }
            }
            if (minAge != null && maxAge != null && minAge > maxAge) {
                throw MemberDomainException("최소 나이가 최대 나이보다 클 수 없어요")
            }
        }
    }
}
