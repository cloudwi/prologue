package com.prologue.backend.dailymeet.domain.model

import org.junit.jupiter.api.Assumptions.assumeTrue
import java.io.File
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * 좌표표는 손으로 적은 데이터라, 사람이 눈으로 훑어서는 오타를 못 잡는다.
 * 여기서는 세 가지를 건다 — 시도별 경계 상자(자리를 크게 벗어난 좌표), 알려진 도시 간 거리
 * (표 전체가 통째로 어긋나는 경우), 앱 지역 목록과의 동기화(빠진 지역).
 */
class RegionGeoTest {

    /** 시도별로 좌표가 들어야 할 대략적인 사각형. 오타를 잡을 만큼만 좁게 잡았다. */
    private val boxes = mapOf(
        "서울" to Box(37.42, 37.72, 126.76, 127.20),
        "경기" to Box(36.90, 38.30, 126.60, 127.80),
        "인천" to Box(37.30, 37.90, 126.40, 126.80),
        "부산" to Box(35.00, 35.40, 128.90, 129.30),
        "대구" to Box(35.70, 36.30, 128.40, 128.70),
        "대전" to Box(36.25, 36.45, 127.30, 127.50),
        "광주" to Box(35.05, 35.25, 126.75, 127.00),
        "울산" to Box(35.45, 35.70, 129.15, 129.50),
        "세종" to Box(36.40, 36.60, 127.20, 127.35),
        "강원" to Box(37.10, 38.30, 127.60, 129.30),
        "충북" to Box(36.10, 37.20, 127.35, 128.45),
        "충남" to Box(36.10, 36.95, 126.35, 127.30),
        "전북" to Box(35.35, 36.05, 126.60, 127.45),
        "전남" to Box(34.50, 35.40, 126.30, 127.75),
        "경북" to Box(35.75, 36.90, 128.05, 129.45),
        "경남" to Box(34.80, 35.75, 127.85, 129.10),
        "제주" to Box(33.20, 33.60, 126.45, 126.65),
    )

    private data class Box(val minLat: Double, val maxLat: Double, val minLon: Double, val maxLon: Double)

    @Test
    fun `모든 좌표가 제 시도 안에 있다`() {
        val strays = RegionGeo.keys().filter { key ->
            val point = RegionGeo.pointOf(key)!!
            val box = boxes[key.substringBefore(' ')]
                ?: return@filter true // 모르는 시도 = 키 오타
            point.lat !in box.minLat..box.maxLat || point.lon !in box.minLon..box.maxLon
        }

        assertTrue(strays.isEmpty(), "시도 경계를 벗어난 좌표: $strays")
    }

    @Test
    fun `알려진 도시 사이 거리와 맞는다`() {
        // (기준 거리, 허용 오차) — 대권 거리라 도로 거리보다 짧다.
        assertDistance("서울 종로구", "부산 해운대구", expectedKm = 325.0, toleranceKm = 25.0)
        assertDistance("서울 중구", "대전 서구", expectedKm = 140.0, toleranceKm = 15.0)
        assertDistance("서울 중구", "인천 중구", expectedKm = 34.0, toleranceKm = 8.0)
        assertDistance("제주 제주시", "제주 서귀포시", expectedKm = 27.0, toleranceKm = 6.0)
        assertDistance("서울 강남구", "서울 서초구", expectedKm = 4.0, toleranceKm = 3.0)
    }

    private fun assertDistance(a: String, b: String, expectedKm: Double, toleranceKm: Double) {
        val actual = RegionGeo.distanceKm(a, b)
        assertNotNull(actual, "$a ↔ $b 거리를 구하지 못했다")
        assertTrue(
            abs(actual - expectedKm) <= toleranceKm,
            "$a ↔ $b = ${"%.1f".format(actual)}km, 기대 ${expectedKm}±${toleranceKm}km",
        )
    }

    @Test
    fun `거리는 대칭이고 자기 자신과는 0이다`() {
        assertEquals(0.0, RegionGeo.distanceKm("서울 마포구", "서울 마포구")!!, 0.001)
        assertEquals(
            RegionGeo.distanceKm("서울 마포구", "부산 중구")!!,
            RegionGeo.distanceKm("부산 중구", "서울 마포구")!!,
            0.001,
        )
    }

    @Test
    fun `모르는 지역은 null을 돌려준다`() {
        assertNull(RegionGeo.distanceKm("서울 강남구", "화성 세종기지"))
        assertNull(RegionGeo.distanceKm("", "서울 강남구"))
    }

    @Test
    fun `이름이 겹치는 구는 시도까지 봐야 갈린다`() {
        // 중구는 서울·인천·부산·대구·대전·울산에 있다. 시군구만으로 키를 잡으면 전부 한 점이 된다.
        val seoulToBusan = RegionGeo.distanceKm("서울 중구", "부산 중구")!!
        assertTrue(seoulToBusan > 300, "서울 중구와 부산 중구가 ${"%.1f".format(seoulToBusan)}km로 붙어 있다")
    }

    @Test
    fun `앱의 지역 목록과 어긋나지 않는다`() {
        val app = appRegions()
        assumeTrue(app != null, "app/src/constants/regions.ts를 찾지 못해 건너뛴다")

        val expected = app!!.flatMap { (sido, districts) -> districts.map { "$sido $it" } }.toSet()
        val missing = expected - RegionGeo.keys()
        val extra = RegionGeo.keys() - expected

        assertTrue(missing.isEmpty(), "앱에는 있는데 좌표가 없는 지역: $missing")
        assertTrue(extra.isEmpty(), "좌표만 있고 앱에서 고를 수 없는 지역: $extra")
    }

    /**
     * `app/src/constants/regions.ts`를 읽어 시도 → 시군구 목록으로 되돌린다.
     * 모노레포 안에서만 찾을 수 있으므로, 없으면 null을 돌려 테스트를 건너뛰게 한다.
     */
    private fun appRegions(): Map<String, List<String>>? {
        val file = listOf(
            File("../app/src/constants/regions.ts"),
            File("app/src/constants/regions.ts"),
        ).firstOrNull { it.exists() } ?: return null

        val body = file.readText().substringAfter("REGIONS: Record<string, string[]> = {", "")
            .substringBefore("\n};")
        if (body.isBlank()) return null

        return Regex("""(\S+):\s*\[(.*?)]""", RegexOption.DOT_MATCHES_ALL)
            .findAll(body)
            .associate { match ->
                match.groupValues[1] to
                    Regex("'([^']+)'").findAll(match.groupValues[2]).map { it.groupValues[1] }.toList()
            }
            .filterValues { it.isNotEmpty() }
            .takeIf { it.isNotEmpty() }
    }
}
