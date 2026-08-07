package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Question

interface QuestionRepository {
    /** id 오름차순 전체 질문 (오늘의 질문 선택용). */
    fun findAllOrdered(): List<Question>

    /** 질문 추가/수정 — 같은 id가 있으면 내용을 덮어쓴다(어드민 질문 관리). */
    fun save(question: Question): Question
}
