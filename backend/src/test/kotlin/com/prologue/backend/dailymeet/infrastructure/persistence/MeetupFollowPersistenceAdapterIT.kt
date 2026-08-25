package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.support.PostgresRepositoryTest
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

/**
 * 모임 따라가기 저장소 — 진짜 Postgres에 실제로 쿼리를 던진다.
 *
 * 이 테스트가 없어서 놓친 버그(2026-08-25): `meetup_follows`는 (account_id, series_id)가
 * `@EmbeddedId`인데 파생 쿼리 `findByAccountId`를 썼다. 엔티티에 편의 게터가 있어 이름은 해석됐지만
 * 실제 영속 속성은 `id.accountId`뿐이라 **실행 시점에** 터졌고, `GET /meetups`가 통째로 500이 됐다.
 * mockk 유닛 테스트로는 절대 잡히지 않는다 — 저장소를 가짜로 두면 쿼리가 돌지 않기 때문이다.
 */
@Import(MeetupFollowPersistenceAdapter::class)
class MeetupFollowPersistenceAdapterIT : PostgresRepositoryTest() {

    @Autowired
    private lateinit var follows: MeetupFollowPersistenceAdapter

    private val me = UUID.randomUUID()
    private val someoneElse = UUID.randomUUID()
    private val series = UUID.randomUUID()
    private val otherSeries = UUID.randomUUID()

    @Test
    fun `따라가면 내 목록과 그 모임의 구독자 목록 양쪽에서 보인다`() {
        follows.follow(me, series)

        assertEquals(setOf(series), follows.findSeriesIdsByAccount(me))
        assertEquals(listOf(me), follows.findAccountIdsBySeries(series))
    }

    @Test
    fun `따라가기를 끄면 사라진다`() {
        follows.follow(me, series)
        follows.unfollow(me, series)

        assertTrue(follows.findSeriesIdsByAccount(me).isEmpty())
        assertTrue(follows.findAccountIdsBySeries(series).isEmpty())
    }

    @Test
    fun `두 번 따라가도 한 번만 담긴다`() {
        // 버튼이 두 번 눌려도 같은 상태여야 한다 — 복합키라 DB가 막지만, 예외 없이 지나가야 한다.
        follows.follow(me, series)
        follows.follow(me, series)

        assertEquals(1, follows.findAccountIdsBySeries(series).size)
    }

    @Test
    fun `남의 구독과 다른 모임의 구독은 섞이지 않는다`() {
        // 복합키의 두 열이 각각 제대로 걸리는지 — 한쪽만 조건에 걸리면 남의 구독이 새어 나온다.
        follows.follow(me, series)
        follows.follow(someoneElse, series)
        follows.follow(me, otherSeries)

        assertEquals(setOf(series, otherSeries), follows.findSeriesIdsByAccount(me))
        assertEquals(setOf(series), follows.findSeriesIdsByAccount(someoneElse))
        assertEquals(setOf(me, someoneElse), follows.findAccountIdsBySeries(series).toSet())
        assertEquals(listOf(me), follows.findAccountIdsBySeries(otherSeries))
    }

    @Test
    fun `따라가지 않은 모임은 빈 결과다`() {
        assertFalse(series in follows.findSeriesIdsByAccount(me))
        assertTrue(follows.findAccountIdsBySeries(series).isEmpty())
    }
}
