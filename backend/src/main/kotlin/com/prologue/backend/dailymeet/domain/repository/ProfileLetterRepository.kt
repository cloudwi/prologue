package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.ProfileLetter
import java.util.UUID

interface ProfileLetterRepository {
    fun findAllByAccountId(accountId: UUID): List<ProfileLetter>
    fun findByAccountIdAndQuestionId(accountId: UUID, questionId: Long): ProfileLetter?
    fun save(letter: ProfileLetter): ProfileLetter
    fun delete(letter: ProfileLetter)
}
