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
 * 취향 카드([TasteAffinity])는 프로필 키워드보다 무겁게 잡았다(0.15 대 0.10). 키워드는 자기가 고른
 * 자기소개라 다들 비슷한 말을 적지만, 카드는 같은 물음에 각자 고른 값이라 두 사람을 실제로 가른다.
 * 대신 아무나 절반은 겹치므로, 그 절반은 [TasteAffinity]가 미리 0으로 깎아 넘긴다.
 *
 * 가중치는 확정이 아니라 출발점이다 — 유저가 쌓이면 하트 전환율을 보고 조정한다.
 */
object PeerScore {
    private const val REGION_WEIGHT = 0.25
    private const val AGE_WEIGHT = 0.25
    private const val KEYWORD_WEIGHT = 0.10
    private const val TASTE_WEIGHT = 0.15
    private const val FAIRNESS_WEIGHT = 0.25

    /** 이 이상 나이가 벌어지면 나이 점수는 0. */
    private const val AGE_TOLERANCE = 10.0

    /** 이만큼 떨어지면 지역 점수는 0. 왕복 두 시간쯤 되는 거리로 잡았다. */
    private const val REGION_FULL_DISTANCE_KM = 60.0

    /** 아무리 멀어도 같은 시도면 이만큼은 준다 — 행정구역도 생활권 신호이긴 하다. */
    private const val SAME_PROVINCE_FLOOR = 0.4

    /** 좌표를 모르는 지역끼리의 폴백. [RegionGeo]에 없는 문자열이 와도 옛 방식으로 동작한다. */
    private const val UNKNOWN_SAME_PROVINCE = 0.6

    /** 이만큼 겹치면 관심사 점수 만점. */
    private const val KEYWORD_FULL_MATCH = 3.0

    /**
     * @param exposureCount 오늘 이 상대가 다른 사람에게 소개된 횟수
     * @param tasteOverlap 취향 카드가 겹치는 정도([TasteAffinity]). 둘 중 한쪽이 안 넘겼으면 0.
     */
    fun of(
        me: Member,
        peer: Member,
        exposureCount: Long,
        today: LocalDate = LocalDate.now(),
        tasteOverlap: Double = 0.0,
    ): Double =
        REGION_WEIGHT * regionScore(me.region, peer.region) +
            AGE_WEIGHT * ageScore(me.birthDate, peer.birthDate, today) +
            KEYWORD_WEIGHT * keywordScore(me, peer) +
            TASTE_WEIGHT * tasteOverlap.coerceIn(0.0, 1.0) +
            FAIRNESS_WEIGHT * fairnessScore(exposureCount)

    /**
     * 지역 근접도 — 행정구역이 아니라 **거리**로 잰다.
     *
     * 시도 경계는 거리와 무관하다. 예전처럼 경계로만 재면 강남구와 성남시(차로 20분)가 0점인데
     * 연천군과 평택시(두 시간)는 0.6점을 받았다. 같은 서울 안에서도 옆 구와 반대편 끝이 똑같았다.
     * 그래서 [RegionGeo]의 시군구 대표 좌표로 실제 거리를 구해 [REGION_FULL_DISTANCE_KM]까지
     * 선형으로 깎는다.
     *
     * 다만 거리만 보면 인구가 흩어진 도(道)의 회원이 지역 점수를 영영 못 받는다. 같은 시도끼리는
     * [SAME_PROVINCE_FLOOR]를 바닥으로 깔아, 거리가 있어도 아주 버려지지는 않게 했다.
     *
     * 좌표를 모르는 문자열(앱의 지역 목록이 앞서 나갔거나 옛 데이터)은 예전 방식으로 폴백한다.
     */
    internal fun regionScore(mine: String, theirs: String): Double {
        if (mine.isBlank() || theirs.isBlank()) return 0.0
        val a = mine.trim()
        val b = theirs.trim()
        if (a == b) return 1.0

        val sameProvince = province(a) == province(b)
        val km = RegionGeo.distanceKm(a, b)
            ?: return if (sameProvince) UNKNOWN_SAME_PROVINCE else 0.0

        val byDistance = max(0.0, 1.0 - km / REGION_FULL_DISTANCE_KM)
        return if (sameProvince) max(SAME_PROVINCE_FLOOR, byDistance) else byDistance
    }

    private fun province(region: String): String = region.trim().substringBefore(' ')

    /** 나이 차가 없으면 1점, AGE_TOLERANCE만큼 벌어지면 0점으로 선형 감소. */
    internal fun ageScore(mine: LocalDate, theirs: LocalDate, today: LocalDate): Double {
        val diff = abs(ChronoUnit.YEARS.between(mine, today) - ChronoUnit.YEARS.between(theirs, today))
        return max(0.0, 1.0 - diff / AGE_TOLERANCE)
    }

    /**
     * 취미·관심사가 겹치는 정도. 한쪽이라도 비어 있으면 0 — 없는 걸 벌주지는 않고 가산점만 없앤다.
     *
     * 장점(`strengths`)은 **일부러 뺐다.** 온보딩은 셋을 한 화면에서 받지만, 장점은 자기 PR이라
     * 다들 비슷한 말을 적어 두 사람을 가르지 못한다([TasteAffinity]가 인기 선택지를 깎는 것과 같은 이유).
     */
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
