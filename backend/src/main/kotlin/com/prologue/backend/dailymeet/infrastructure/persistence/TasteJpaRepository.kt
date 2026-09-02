package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface TasteCardJpaRepository : JpaRepository<TasteCardJpaEntity, Long> {
    fun findAllByOrderByIdAsc(): List<TasteCardJpaEntity>
}

/*
 * 키가 @EmbeddedId라 파생 쿼리(findByAccountId)는 실행 시점에 터진다 —
 * 편의 게터가 있어 이름은 해석되지만 실제 영속 속성은 id.accountId뿐이다(MeetupFollow에서 한 번 겪었다).
 * 경로를 명시해 둔다.
 */
interface TasteChoiceJpaRepository : JpaRepository<TasteChoiceJpaEntity, TasteChoiceId> {
    @Query("select c from TasteChoiceJpaEntity c where c.id.accountId = :accountId order by c.id.cardId asc")
    fun findAllByAccount(@Param("accountId") accountId: UUID): List<TasteChoiceJpaEntity>

    @Query("select c from TasteChoiceJpaEntity c where c.id.accountId in :accountIds")
    fun findAllByAccounts(@Param("accountIds") accountIds: Collection<UUID>): List<TasteChoiceJpaEntity>
}
