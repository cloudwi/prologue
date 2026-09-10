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

        // 문답 화면은 질문을 두세 줄로 보여준다. 길어지면 답 쓰는 자리가 밀린다.
        val tooLong = pool.filter { it.content.length > 80 }
        assertTrue(tooLong.isEmpty(), "너무 긴 질문: ${tooLong.take(3).map { it.id to it.content.length }}")
    }
}
