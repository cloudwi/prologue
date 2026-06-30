package com.prologue.backend.dailymeet.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "questions")
class QuestionJpaEntity(
    @Id
    @Column(name = "id")
    val id: Long,

    @Column(name = "content", nullable = false, length = 500)
    val content: String,
)
