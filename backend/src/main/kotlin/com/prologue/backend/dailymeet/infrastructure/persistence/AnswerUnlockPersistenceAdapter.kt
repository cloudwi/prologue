package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.AnswerUnlock
import com.prologue.backend.dailymeet.domain.repository.AnswerUnlockRepository
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

/** answer_unlocks 매핑. 한번 저장하면 갱신하지 않는 append-only 기록. */
@Entity
@Table(name = "answer_unlocks")
class AnswerUnlockJpaEntity(
    @Id @Column(name = "id", nullable = false, updatable = false) val id: UUID,
    @Column(name = "account_id", nullable = false, updatable = false) val accountId: UUID,
    @Column(name = "question_id", nullable = false, updatable = false) val questionId: Long,
    @Column(name = "created_at", nullable = false, updatable = false) val createdAt: Instant,
)

interface AnswerUnlockJpaRepository : JpaRepository<AnswerUnlockJpaEntity, UUID> {
    fun existsByAccountIdAndQuestionId(accountId: UUID, questionId: Long): Boolean
    fun findByAccountId(accountId: UUID): List<AnswerUnlockJpaEntity>
}

/**
 * 문답 열람권 어댑터. 중복은 조회로 먼저 걸러내되 최종 판정은 유니크 제약에 맡긴다 —
 * 두 요청이 같은 순간에 들어오면 조회는 둘 다 "없음"을 볼 수 있다.
 */
@Repository
class AnswerUnlockPersistenceAdapter(
    private val jpa: AnswerUnlockJpaRepository,
) : AnswerUnlockRepository {

    override fun saveIfNew(unlock: AnswerUnlock): Boolean {
        if (jpa.existsByAccountIdAndQuestionId(unlock.accountId, unlock.questionId)) return false
        return try {
            jpa.saveAndFlush(unlock.toEntity())
            true
        } catch (e: DataIntegrityViolationException) {
            false // 동시에 들어온 같은 요청 — 먼저 온 쪽만 잉크를 쓴다
        }
    }

    override fun findQuestionIds(accountId: UUID): Set<Long> =
        jpa.findByAccountId(accountId).map { it.questionId }.toSet()

    private fun AnswerUnlock.toEntity() = AnswerUnlockJpaEntity(
        id = id,
        accountId = accountId,
        questionId = questionId,
        createdAt = createdAt,
    )
}
