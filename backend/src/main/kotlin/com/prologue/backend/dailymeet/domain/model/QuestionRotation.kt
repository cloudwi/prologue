package com.prologue.backend.dailymeet.domain.model

import java.time.LocalDate

/**
 * 오늘의 질문을 고르는 규칙 — 날짜만으로 결정된다.
 *
 * 같은 날이면 모두가 같은 질문을 받아야 "같은 질문에 답한 사람"이라는 소개의 전제가 성립한다.
 * 그래서 무작위가 아니라 날짜(epochDay)를 질문 수로 나눈 나머지를 쓴다 — 서버가 몇 대든,
 * 언제 물어보든 같은 답이 나온다.
 *
 * 이 공식은 오늘의 문답·상대 후보·어드민의 "오늘" 배지가 함께 쓴다. 한 곳에만 두는 이유가 그것이다.
 */
object QuestionRotation {

    /** [date]의 질문. 질문 풀이 비어 있으면 예외 — 서비스가 성립하지 않는 상태다. */
    fun of(questions: List<Question>, date: LocalDate): Question {
        if (questions.isEmpty()) throw DailyMeetException("등록된 질문이 없습니다")
        return questions[indexOn(questions.size, date, daysAgo = 0)]
    }

    /**
     * [date]부터 거슬러 [days]일치 질문 id.
     * 유저가 적을 때 후보를 하루치로 묶으면 아무도 만나지 못해, 며칠치를 함께 본다.
     */
    fun recentIds(questions: List<Question>, date: LocalDate, days: Int): List<Long> {
        if (questions.isEmpty()) return emptyList()
        return (0 until days.coerceAtLeast(1))
            .map { questions[indexOn(questions.size, date, daysAgo = it)].id }
            .distinct()
    }

    private fun indexOn(poolSize: Int, date: LocalDate, daysAgo: Int): Int =
        ((date.toEpochDay() - daysAgo) % poolSize).toInt()
}
