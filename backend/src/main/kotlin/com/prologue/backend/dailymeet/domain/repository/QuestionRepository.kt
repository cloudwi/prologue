package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Question

interface QuestionRepository {
    /** id 오름차순 전체 질문 (오늘의 질문 선택용). */
    fun findAllOrdered(): List<Question>
}
