package com.prologue.backend.dailymeet.domain.model

import com.prologue.backend.member.domain.model.Member
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * 오늘의 상대를 고르는 점수 — 높을수록 먼저 소개된다.
 *
 * 성별 선호처럼 "아니면 안 되는" 조건은 후보를 거를 때 이미 걸러졌다. 여기서 다루는 건
 * 통과한 후보들 사이의 우선순위, 즉 서로 호감을 느낄 가능성이다.
 *
 * 공평 분배(fairness)를 점수에 섞는 이유: 조건만으로 고르면 인기 있는 몇 명에게 노출이 쏠린다.
 * 그러면 그 사람은 감당 못 할 관심을 받고 나머지는 영영 소개되지 않는다. 노출될수록 점수가
 * 빠르게 깎이게 해서, 매력적인 상대를 우선하되 한 사람만 계속 내보내지는 않게 한다.
 *
 * 가중치는 확정이 아니라 출발점이다 — 유저가 쌓이면 하트 전환율을 보고 조정한다.
 */
object PeerScore {
    private const val REGION_WEIGHT = 0.30
    private const val AGE_WEIGHT = 0.30
    private const val KEYWORD_WEIGHT = 0.15
    private const val FAIRNESS_WEIGHT = 0.25

    /** 이 이상 나이가 벌어지면 나이 점수는 0. */
    private const val AGE_TOLERANCE = 10.0

    /** 이만큼 겹치면 관심사 점수 만점. */
    private const val KEYWORD_FULL_MATCH = 3.0

    /**
     * @param exposureCount 오늘 이 상대가 다른 사람에게 소개된 횟수
     */
    fun of(me: Member, peer: Member, exposureCount: Long, today: LocalDate = LocalDate.now()): Double =
        REGION_WEIGHT * regionScore(me.region, peer.region) +
            AGE_WEIGHT * ageScore(me.birthDate, peer.birthDate, today) +
            KEYWORD_WEIGHT * keywordScore(me, peer) +
            FAIRNESS_WEIGHT * fairnessScore(exposureCount)

    /**
     * 지역 근접도. 지역은 "서울 성동구"처럼 시도와 시군구가 한 문자열로 온다.
     * 같은 동네면 만나기 쉽고, 같은 시도면 그럭저럭, 다르면 아예 점수를 주지 않는다.
     */
    internal fun regionScore(mine: String, theirs: String): Double = when {
        mine.isBlank() || theirs.isBlank() -> 0.0
        mine.trim() == theirs.trim() -> 1.0
        province(mine) == province(theirs) -> 0.6
        else -> 0.0
    }

    private fun province(region: String): String = region.trim().substringBefore(' ')

    /** 나이 차가 없으면 1점, AGE_TOLERANCE만큼 벌어지면 0점으로 선형 감소. */
    internal fun ageScore(mine: LocalDate, theirs: LocalDate, today: LocalDate): Double {
        val diff = abs(ChronoUnit.YEARS.between(mine, today) - ChronoUnit.YEARS.between(theirs, today))
        return max(0.0, 1.0 - diff / AGE_TOLERANCE)
    }

    /** 취미·관심사가 겹치는 정도. 한쪽이라도 비어 있으면 0 — 없는 걸 벌주지는 않고 가산점만 없앤다. */
    internal fun keywordScore(me: Member, peer: Member): Double {
        val mine = keywordsOf(me)
        val theirs = keywordsOf(peer)
        if (mine.isEmpty() || theirs.isEmpty()) return 0.0
        return min(1.0, mine.intersect(theirs).size / KEYWORD_FULL_MATCH)
    }

    private fun keywordsOf(member: Member): Set<String> =
        (member.hobbies + member.interests).map { it.trim() }.filter { it.isNotBlank() }.toSet()

    /** 노출될수록 급격히 낮아진다: 0회 1.0 → 1회 0.5 → 2회 0.33. */
    internal fun fairnessScore(exposureCount: Long): Double = 1.0 / (1.0 + max(0L, exposureCount))
}
