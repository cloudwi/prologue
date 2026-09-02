package com.prologue.backend.member.infrastructure.persistence

import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.repository.MemberRepository
import org.springframework.stereotype.Repository
import java.util.UUID

/** MemberRepository 포트의 JPA 어댑터. 도메인 ↔ 엔티티 변환. */
@Repository
class MemberPersistenceAdapter(
    private val jpa: MemberJpaRepository,
) : MemberRepository {

    override fun findByAccountId(accountId: UUID): Member? =
        jpa.findById(accountId).orElse(null)?.toDomain()

    override fun save(member: Member): Member =
        jpa.save(member.toEntity()).toDomain()

    private fun Member.toEntity(): MemberJpaEntity =
        MemberJpaEntity(
            accountId = accountId,
            nickname = nickname,
            gender = gender,
            birthDate = birthDate,
            preferredGender = preferredGender,
            minAge = minAge,
            maxAge = maxAge,
            region = region,
            createdAt = createdAt,
            bio = bio,
            heightCm = heightCm,
            bodyType = bodyType,
            hobbies = hobbies.joinToString(",").ifBlank { null },
            interests = interests.joinToString(",").ifBlank { null },
            strengths = strengths.joinToString(",").ifBlank { null },
            avatarId = avatarId,
            photoUrls = photoUrls.joinToString(",").ifBlank { null },
            phone = phone,
            kakaoId = kakaoId,
            religion = religion,
            politicalLeaning = politicalLeaning,
        )

    private fun MemberJpaEntity.toDomain(): Member =
        Member.reconstitute(
            accountId = accountId,
            nickname = nickname,
            gender = gender,
            birthDate = birthDate,
            preferredGender = preferredGender,
            minAge = minAge,
            maxAge = maxAge,
            region = region,
            createdAt = createdAt,
            bio = bio,
            heightCm = heightCm,
            bodyType = bodyType,
            hobbies = splitKeywords(hobbies),
            interests = splitKeywords(interests),
            strengths = splitKeywords(strengths),
            avatarId = avatarId,
            photoUrls = splitKeywords(photoUrls),
            phone = phone,
            kakaoId = kakaoId,
            religion = religion,
            politicalLeaning = politicalLeaning,
        )

    private fun splitKeywords(joined: String?): List<String> =
        joined?.split(",")?.map { it.trim() }?.filter { it.isNotBlank() } ?: emptyList()
}
