package com.prologue.backend.member.domain.model

import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

/**
 * 소개팅 프로필 애그리거트 루트.
 * 인증(Account)과 1:1로 대응하며 [accountId]로 연결된다. (auth 컨텍스트와는 ID 참조로만 결합)
 *
 * 항목: 닉네임 · 성별 · 생년 · 선호 성별 · 지역. (가치관은 매일 문답으로 별도 축적)
 */
class Member private constructor(
    val accountId: UUID,
    nickname: String,
    gender: Gender,
    birthYear: Int,
    preferredGender: Gender,
    region: String,
    val createdAt: Instant,
) {
    var nickname: String = nickname
        private set
    var gender: Gender = gender
        private set
    var birthYear: Int = birthYear
        private set
    var preferredGender: Gender = preferredGender
        private set
    var region: String = region
        private set

    /** 프로필 수정(재온보딩/편집). */
    fun updateProfile(
        nickname: String,
        gender: Gender,
        birthYear: Int,
        preferredGender: Gender,
        region: String,
    ) {
        validate(nickname, birthYear, region)
        this.nickname = nickname.trim()
        this.gender = gender
        this.birthYear = birthYear
        this.preferredGender = preferredGender
        this.region = region.trim()
    }

    companion object {
        private const val NICKNAME_MAX = 30
        private const val MIN_BIRTH_YEAR = 1920

        fun register(
            accountId: UUID,
            nickname: String,
            gender: Gender,
            birthYear: Int,
            preferredGender: Gender,
            region: String,
            now: Instant = Instant.now(),
        ): Member {
            validate(nickname, birthYear, region, now)
            return Member(accountId, nickname.trim(), gender, birthYear, preferredGender, region.trim(), now)
        }

        /** 영속 저장소에서 복원(인프라 전용, 검증 생략). */
        fun reconstitute(
            accountId: UUID,
            nickname: String,
            gender: Gender,
            birthYear: Int,
            preferredGender: Gender,
            region: String,
            createdAt: Instant,
        ): Member = Member(accountId, nickname, gender, birthYear, preferredGender, region, createdAt)

        private fun validate(nickname: String, birthYear: Int, region: String, now: Instant = Instant.now()) {
            if (nickname.isBlank()) throw MemberDomainException("닉네임은 필수입니다")
            if (nickname.trim().length > NICKNAME_MAX) {
                throw MemberDomainException("닉네임은 ${NICKNAME_MAX}자 이하여야 합니다")
            }
            val currentYear = now.atZone(ZoneOffset.UTC).year
            if (birthYear < MIN_BIRTH_YEAR || birthYear > currentYear) {
                throw MemberDomainException("생년이 올바르지 않습니다")
            }
            if (region.isBlank()) throw MemberDomainException("지역은 필수입니다")
        }
    }
}
