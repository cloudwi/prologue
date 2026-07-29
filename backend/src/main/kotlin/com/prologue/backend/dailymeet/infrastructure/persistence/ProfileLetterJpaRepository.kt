package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ProfileLetterJpaRepository : JpaRepository<ProfileLetterJpaEntity, UUID> {
    fun findAllByAccountIdOrderByCreatedAtAsc(accountId: UUID): List<ProfileLetterJpaEntity>
    fun findByAccountIdAndQuestionId(accountId: UUID, questionId: Long): ProfileLetterJpaEntity?
}
