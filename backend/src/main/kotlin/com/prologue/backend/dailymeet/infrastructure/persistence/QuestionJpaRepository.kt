package com.prologue.backend.dailymeet.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository

interface QuestionJpaRepository : JpaRepository<QuestionJpaEntity, Long> {
    fun findAllByOrderByIdAsc(): List<QuestionJpaEntity>
}
