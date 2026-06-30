package com.prologue.backend.dailymeet.domain.model

/**
 * 문답 질문 (운영 시드 콘텐츠, 공개 성격이라 순차 id 사용).
 * "오늘의 질문"은 풀에서 날짜 기준으로 선택된다.
 */
class Question(
    val id: Long,
    val content: String,
)
