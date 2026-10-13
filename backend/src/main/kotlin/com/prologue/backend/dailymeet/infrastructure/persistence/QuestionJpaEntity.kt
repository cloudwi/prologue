package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import com.prologue.backend.dailymeet.domain.model.QuestionInputType
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated

@Entity
@Table(name = "questions")
class QuestionJpaEntity(
    @Id
    @Column(name = "id")
    val id: Long,

    @Column(name = "content", nullable = false, length = 500)
    val content: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "input_type", nullable = false, length = 24)
    val inputType: QuestionInputType = QuestionInputType.TEXT,
    @Column(name = "option_a", length = 80) val optionA: String? = null,
    @Column(name = "option_b", length = 80) val optionB: String? = null,
    @Column(name = "option_c", length = 80) val optionC: String? = null,
    @Column(name = "option_d", length = 80) val optionD: String? = null,
)
