package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.ProfileLetter
import com.prologue.backend.dailymeet.domain.repository.ProfileLetterRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class ProfileLetterPersistenceAdapter(
    private val jpa: ProfileLetterJpaRepository,
) : ProfileLetterRepository {

    override fun findAllByAccountId(accountId: UUID): List<ProfileLetter> =
        jpa.findAllByAccountIdOrderByCreatedAtAsc(accountId).map { it.toDomain() }

    override fun findByAccountIdAndQuestionId(accountId: UUID, questionId: Long): ProfileLetter? =
        jpa.findByAccountIdAndQuestionId(accountId, questionId)?.toDomain()

    override fun save(letter: ProfileLetter): ProfileLetter =
        jpa.save(letter.toEntity()).toDomain()

    override fun delete(letter: ProfileLetter) {
        letter.id?.let(jpa::deleteById)
    }

    private fun ProfileLetter.toEntity(): ProfileLetterJpaEntity =
        ProfileLetterJpaEntity(
            id = id,
            accountId = accountId,
            questionId = questionId,
            content = content,
            createdAt = createdAt,
            updatedAt = updatedAt,
        )

    private fun ProfileLetterJpaEntity.toDomain(): ProfileLetter =
        ProfileLetter.reconstitute(
            id = requireNotNull(id) { "영속된 편지는 id를 가진다" },
            accountId = accountId,
            questionId = questionId,
            content = content,
            createdAt = createdAt,
            updatedAt = updatedAt,
        )
}
