package com.prologue.backend.dailymeet.domain.model

/**
 * 문답 질문 (운영 시드 콘텐츠, 공개 성격이라 순차 id 사용).
 * "오늘의 질문"은 풀에서 날짜 기준으로 선택된다.
 */
class Question(
    val id: Long,
    val content: String,
    val inputType: QuestionInputType = QuestionInputType.TEXT,
    val options: List<QuestionOption> = emptyList(),
) {
    init {
        if (inputType == QuestionInputType.TEXT) {
            if (options.isNotEmpty()) throw DailyMeetException("주관식 질문에는 선택지를 넣을 수 없습니다")
        } else {
            if (options.size !in 2..4 || options.any { it.label.isBlank() || it.label.length > 80 } || options.map { it.label }.distinct().size != options.size) {
                throw DailyMeetException("서로 다른 선택지 두 개부터 네 개까지 입력해주세요")
            }
            val expectedIds = if (inputType == QuestionInputType.OX) listOf("O", "X") else listOf("A", "B", "C", "D").take(options.size)
            if (options.map { it.id } != expectedIds) throw DailyMeetException("선택지 번호가 올바르지 않습니다")
        }
    }

    /** 선택지는 서버에 등록된 값만 받고, 표시 문구는 서버가 만든다. */
    fun selection(ids: List<String>): Pair<List<String>, String> {
        if (inputType == QuestionInputType.TEXT) throw DailyMeetException("이 질문은 글로 답해주세요")
        if (ids.isEmpty() || ids.size > options.size || ids.distinct().size != ids.size || ids.any { id -> options.none { it.id == id } }) {
            throw DailyMeetException("질문에 있는 선택지를 골라주세요")
        }
        if (inputType != QuestionInputType.MULTIPLE_CHOICE && ids.size != 1) throw DailyMeetException("한 가지를 골라주세요")
        val picked = options.filter { it.id in ids }
        return picked.map { it.id } to picked.joinToString(" · ") { if (inputType == QuestionInputType.OX) "${it.id} · ${it.label}" else it.label }
    }
}

enum class QuestionInputType { TEXT, OX, SINGLE_CHOICE, MULTIPLE_CHOICE }
data class QuestionOption(val id: String, val label: String)
