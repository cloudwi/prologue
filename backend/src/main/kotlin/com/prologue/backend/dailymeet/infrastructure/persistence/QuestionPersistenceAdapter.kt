package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import org.springframework.stereotype.Repository

@Repository
class QuestionPersistenceAdapter(
    private val jpa: QuestionJpaRepository,
) : QuestionRepository {
    override fun findAllOrdered(): List<Question> =
        jpa.findAllByOrderByIdAsc().map { Question(it.id, it.content) }
}
