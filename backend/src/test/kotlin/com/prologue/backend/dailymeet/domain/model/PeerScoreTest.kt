package com.prologue.backend.dailymeet.domain.model

import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PeerScoreTest {

    private val today = LocalDate.of(2026, 8, 11)

    private fun member(
        birthYear: Int = 1996,
        region: String = "서울 성동구",
        hobbies: List<String> = emptyList(),
        interests: List<String> = emptyList(),
    ) = Member.register(
        accountId = UUID.randomUUID(),
        nickname = "테스터",
        gender = Gender.FEMALE,
        birthDate = LocalDate.of(birthYear, 5, 14),
        preferredGender = Gender.MALE,
        region = region,
        phone = "01012345678",
        hobbies = hobbies,
        interests = interests,
    )

    @Test
    fun `같은 시군구는 만점이고 아주 먼 다른 시도는 0점`() {
        assertEquals(1.0, PeerScore.regionScore("서울 성동구", "서울 성동구"))
        assertEquals(0.0, PeerScore.regionScore("서울 성동구", "부산 해운대구"))
    }

    @Test
    fun `같은 시도 안에서도 가까울수록 높다`() {
        // 예전에는 서울 안이면 어디든 똑같이 0.6이었다.
        assertTrue(
            PeerScore.regionScore("서울 강남구", "서울 서초구") >
                PeerScore.regionScore("서울 강남구", "서울 도봉구"),
        )
    }

    @Test
    fun `시도가 달라도 가까우면 서울 반대편보다 높다`() {
        // 이 줄이 이번 변경의 핵심이다 — 강남에서 분당은 20분, 도봉은 그보다 멀다.
        // 예전에는 시도가 다르다는 이유로 성남시가 0점이었다.
        val bundang = PeerScore.regionScore("서울 강남구", "경기 성남시")
        val dobong = PeerScore.regionScore("서울 강남구", "서울 도봉구")

        assertTrue(bundang > 0.7, "강남 ↔ 성남 = $bundang")
        assertTrue(bundang > dobong, "강남 ↔ 성남($bundang)이 강남 ↔ 도봉($dobong)보다 낮다")
    }

    @Test
    fun `같은 시도라도 멀면 바닥 점수까지 떨어진다`() {
        // 연천과 평택은 둘 다 경기지만 두 시간 거리다 — 예전에는 0.6을 받았다.
        assertEquals(0.4, PeerScore.regionScore("경기 연천군", "경기 평택시"))
    }

    @Test
    fun `좌표를 모르는 지역은 옛 방식으로 폴백한다`() {
        // 앱의 지역 목록이 앞서 나갔거나 옛 데이터가 남은 경우.
        assertEquals(0.6, PeerScore.regionScore("서울 새로생긴구", "서울 강남구"))
        assertEquals(0.0, PeerScore.regionScore("화성 세종기지", "서울 강남구"))
    }

    @Test
    fun `지역이 비어 있으면 가산점을 주지 않는다`() {
        assertEquals(0.0, PeerScore.regionScore("", "서울 성동구"))
    }

    @Test
    fun `나이가 같으면 만점이고 멀어질수록 낮아진다`() {
        val me = LocalDate.of(1996, 5, 14)

        assertEquals(1.0, PeerScore.ageScore(me, LocalDate.of(1996, 5, 14), today))
        assertEquals(0.5, PeerScore.ageScore(me, LocalDate.of(1991, 5, 14), today))
    }

    @Test
    fun `허용 범위를 넘게 벌어진 나이는 0점이며 음수가 되지 않는다`() {
        val me = LocalDate.of(1996, 5, 14)

        assertEquals(0.0, PeerScore.ageScore(me, LocalDate.of(1976, 5, 14), today))
    }

    @Test
    fun `관심사가 겹칠수록 점수가 오르고 세 개면 만점이다`() {
        val me = member(hobbies = listOf("등산", "영화"), interests = listOf("사진"))
        val same = member(hobbies = listOf("등산", "영화"), interests = listOf("사진"))
        val partial = member(hobbies = listOf("등산"), interests = listOf("요리"))

        assertEquals(1.0, PeerScore.keywordScore(me, same))
        assertTrue(PeerScore.keywordScore(me, partial) in 0.3..0.4)
    }

    @Test
    fun `한쪽이 키워드를 적지 않았으면 가산점이 없다`() {
        assertEquals(0.0, PeerScore.keywordScore(member(hobbies = listOf("등산")), member()))
    }

    @Test
    fun `노출될수록 공평 분배 점수가 빠르게 깎인다`() {
        assertEquals(1.0, PeerScore.fairnessScore(0))
        assertEquals(0.5, PeerScore.fairnessScore(1))
        assertTrue(PeerScore.fairnessScore(5) < PeerScore.fairnessScore(2))
    }

    @Test
    fun `조건이 비슷하면 아직 소개되지 않은 상대가 먼저 뽑힌다`() {
        val me = member()
        val peer = member()

        assertTrue(PeerScore.of(me, peer, exposureCount = 0, today = today) > PeerScore.of(me, peer, exposureCount = 3, today = today))
    }

    @Test
    fun `노출이 같다면 가까운 지역과 비슷한 나이가 더 높은 점수를 받는다`() {
        val me = member(birthYear = 1996, region = "서울 성동구")
        val near = member(birthYear = 1996, region = "서울 성동구")
        val far = member(birthYear = 1986, region = "부산 해운대구")

        assertTrue(PeerScore.of(me, near, exposureCount = 0, today = today) > PeerScore.of(me, far, exposureCount = 0, today = today))
    }

    @Test
    fun `여러 번 소개된 완벽한 상대보다 비슷한 조건의 새 상대가 앞선다`() {
        // 공평 분배가 실제로 순위를 뒤집는 지점 — 조건이 좋아도 같은 사람만 계속 내보내지 않는다.
        val me = member(birthYear = 1996, region = "서울 성동구")
        val perfect = member(birthYear = 1996, region = "서울 성동구") // 같은 동네, 동갑
        val nearby = member(birthYear = 1994, region = "서울 마포구") // 같은 시도, 두 살 차

        assertTrue(
            PeerScore.of(me, nearby, exposureCount = 0, today = today) >
                PeerScore.of(me, perfect, exposureCount = 3, today = today),
        )
    }

    @Test
    fun `조건이 크게 어긋난 상대는 새 얼굴이라도 앞지르지 못한다`() {
        // 공평 분배는 비슷한 후보들 사이의 저울이지, 나쁜 매칭을 밀어 올리는 장치가 아니다.
        val me = member(birthYear = 1996, region = "서울 성동구")
        val perfect = member(birthYear = 1996, region = "서울 성동구")
        val distant = member(birthYear = 1986, region = "부산 해운대구") // 열 살 차, 다른 시도

        assertTrue(
            PeerScore.of(me, distant, exposureCount = 0, today = today) <
                PeerScore.of(me, perfect, exposureCount = 3, today = today),
        )
    }
}
