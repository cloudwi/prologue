package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.support.PostgresRepositoryTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

/**
 * 질문 더미가 마이그레이션으로 실제로 들어오는지 — 여기서만 확인된다.
 *
 * 질문은 코드가 아니라 **시드 SQL**이다. 오타 하나가 컴파일도 유닛 테스트도 통과한 뒤
 * 그 질문이 도는 날에야 앱 화면에서 드러난다(1,000개면 최악의 경우 2년 8개월 뒤다).
 * 그래서 문장 규칙을 여기에 그물로 쳐 둔다.
 *
 * [com.prologue.backend.dailymeet.domain.model.QuestionRotation]이 `epochDay % 풀 크기`로
 * 고르므로 **id가 곧 날짜**다. 빈 번호가 생기면 그날 질문이 밀린다 — 연속성도 함께 본다.
 */
@Import(QuestionPersistenceAdapter::class)
class QuestionSeedIT : PostgresRepositoryTest() {

    @Autowired
    private lateinit var questions: QuestionPersistenceAdapter

    @Test
    fun `질문 더미는 1번부터 빈 번호 없이 이어진다`() {
        val pool = questions.findAllOrdered()

        assertTrue(pool.size >= 1000, "시드 질문이 모자란다: ${pool.size}개")
        assertEquals((1L..pool.size).toList(), pool.map { it.id }, "id가 1부터 연속이 아니다")
    }

    @Test
    fun `같은 질문이 두 번 돌아오지 않는다`() {
        val duplicated = questions.findAllOrdered()
            .groupBy { it.content }
            .filterValues { it.size > 1 }

        assertTrue(duplicated.isEmpty(), "중복 질문: ${duplicated.keys.take(5)}")
    }

    @Test
    fun `모든 질문은 물음표로 끝나고 한 화면에 들어간다`() {
        val pool = questions.findAllOrdered()

        val notAsking = pool.filterNot { it.content.trimEnd().endsWith("?") || it.content.trimEnd().endsWith("…") }
        assertTrue(notAsking.isEmpty(), "물음표로 끝나지 않는 질문: ${notAsking.take(3).map { it.id to it.content }}")

        // 글자 수는 줄 수를 보장하지 않지만, 긴 질문이 답 쓰는 자리를 밀지 않게 제한한다.
        val tooLong = pool.filter { it.content.length > 35 }
        assertTrue(tooLong.isEmpty(), "너무 긴 질문: ${tooLong.take(3).map { it.id to it.content.length }}")
    }

    @Test
    fun `가벼운 질문과 요즘 취향 질문이 닷새 간격으로 섞인다`() {
        val pool = questions.findAllOrdered().associateBy { it.id }

        assertEquals("요즘 저장해둔 짧은 영상은 어떤 내용인가요?", pool.getValue(5).content)
        assertEquals("배스킨라빈스 최애 맛은 무엇인가요?", pool.getValue(10).content)
        assertEquals("과자 한 봉지를 모임에 가져간다면 무엇인가요?", pool.getValue(125).content)
        assertEquals("네 컷 사진의 마지막 포즈는 어떻게 하고 싶나요?", pool.getValue(205).content)
        assertEquals("내 사용 설명서 첫 줄에는 뭐라고 써야 할까요?", pool.getValue(500).content)
        assertEquals("둘이 플레이리스트를 만들면 첫 곡은 무엇인가요?", pool.getValue(885).content)
        assertEquals("오늘의 나를 한 문장으로 소개하면 무엇인가요?", pool.getValue(1000).content)
        // 가벼운 질문 사이의 관계·가치관 질문은 없애지 않는다.
        assertEquals("연애 중 혼자만의 시간은 무엇을 채워주나요?", pool.getValue(3).content)
        assertEquals("흔들린 믿음을 회복하려면 무엇이 필요한가요?", pool.getValue(552).content)
    }

    @Test
    fun `주어를 덜어낼 때 깨졌던 만나는 문장을 복원한다`() {
        val pool = questions.findAllOrdered().associateBy { it.id }

        assertEquals("주 몇 번 만나는 게 잘 맞고, 그 이유는 무엇인가요?", pool.getValue(406).content)
        assertEquals("주변의 결혼 소식에 먼저 일어나는 감정은 무엇인가요?", pool.getValue(289).content)
        assertEquals("오랜만에 만나는 날 무엇부터 하고 싶나요?", pool.getValue(986).content)
    }
}
