package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.model.QuestionInputType
import com.prologue.backend.dailymeet.domain.model.QuestionOption
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import org.springframework.stereotype.Repository

@Repository
class QuestionPersistenceAdapter(
    private val jpa: QuestionJpaRepository,
) : QuestionRepository {
    override fun findAllOrdered(): List<Question> =
        jpa.findAllByOrderByIdAsc().map { it.toDomain() }

    override fun save(question: Question): Question =
        jpa.save(QuestionJpaEntity(question.id, question.content, question.inputType,
            question.options.getOrNull(0)?.label, question.options.getOrNull(1)?.label,
            question.options.getOrNull(2)?.label, question.options.getOrNull(3)?.label)).toDomain()

    private fun QuestionJpaEntity.toDomain(): Question {
        val ids = if (inputType == QuestionInputType.OX) listOf("O", "X") else listOf("A", "B", "C", "D")
        val options = listOf(optionA, optionB, optionC, optionD).mapIndexedNotNull { index, label -> label?.let { QuestionOption(ids[index], it) } }
        return Question(id, content, inputType, options)
    }
}
