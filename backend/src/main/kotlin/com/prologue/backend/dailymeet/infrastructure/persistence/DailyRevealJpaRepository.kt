package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface DailyRevealJpaRepository : JpaRepository<DailyRevealJpaEntity, UUID> {
    fun findAllByViewerAccountIdAndQuestionIdOrderByCreatedAtAsc(viewerAccountId: UUID, questionId: Long): List<DailyRevealJpaEntity>
    fun countByQuestionIdAndPeerAnswerId(questionId: Long, peerAnswerId: UUID): Long
    fun findByViewerAccountIdAndCreatedAtAfterOrderByCreatedAtDesc(
        viewerAccountId: UUID,
        since: java.time.Instant,
    ): List<DailyRevealJpaEntity>

    /**
     * 이 사용자에게 한 번이라도 소개된 상대들의 계정 id.
     * 공개 기록은 답변 id로 남으므로 답변을 거쳐 계정을 얻는다 — 같은 사람이 다른 날 다른 답변으로
     * 다시 후보에 오르는 걸 막으려면 답변이 아니라 사람 단위로 걸러야 한다.
     */
    @Query(
        """
        select distinct a.accountId
        from DailyRevealJpaEntity r, AnswerJpaEntity a
        where r.peerAnswerId = a.id and r.viewerAccountId = :viewerAccountId
        """,
    )
    fun findRevealedPeerAccountIds(@Param("viewerAccountId") viewerAccountId: UUID): List<UUID>

    /**
     * 이 사용자가 한 번이라도 소개된 상대들 — [findRevealedPeerAccountIds]의 반대 방향.
     *
     * 소개는 한쪽 화면에만 뜨지만 인연은 쌍으로 맺어진다. 이 방향을 보지 않으면
     * A가 B를 본 뒤 며칠 지나 B에게 A가 소개된다 — 각자에겐 처음이라도 그 쌍은 두 번 이어진 것이고,
     * 이미 하트를 보냈거나 지나쳤던 상대가 '오늘의 인연'으로 돌아온다.
     */
    @Query(
        """
        select distinct r.viewerAccountId
        from DailyRevealJpaEntity r, AnswerJpaEntity a
        where r.peerAnswerId = a.id and a.accountId = :accountId
        """,
    )
    fun findViewersRevealedTo(@Param("accountId") accountId: UUID): List<UUID>
}
