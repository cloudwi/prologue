package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.ProfileLetter
import com.prologue.backend.dailymeet.domain.repository.ProfileLetterRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** 편지 한 통 + 질문 원문. */
data class ProfileLetterView(val questionId: Long, val question: String, val content: String)

/**
 * 프로필 편지 유스케이스 — 질문을 골라 미리 써두는 자기소개(계정당 최대 3통, 400자).
 * 오늘의 문답 답변을 "프로필에 올리기"도 같은 upsert로 처리한다.
 */
@Service
class ProfileLetterService(
    private val profileLetterRepository: ProfileLetterRepository,
    private val questionRepository: QuestionRepository,
) {
    /** 고를 수 있는 질문 풀 전체. */
    @Transactional(readOnly = true)
    fun questions() = questionRepository.findAllOrdered()

    @Transactional(readOnly = true)
    fun myLetters(accountId: UUID): List<ProfileLetterView> = withQuestions(profileLetterRepository.findAllByAccountId(accountId))

    /** 쓰기/고치기 겸용. 같은 질문이면 내용만 바꾸고, 새 질문이면 개수 상한을 확인한 뒤 추가한다. */
    @Transactional
    fun write(accountId: UUID, questionId: Long, content: String): List<ProfileLetterView> {
        if (questionRepository.findAllOrdered().none { it.id == questionId }) {
            throw DailyMeetException("없는 질문입니다")
        }
        val existing = profileLetterRepository.findByAccountIdAndQuestionId(accountId, questionId)
        if (existing != null) {
            existing.updateContent(content)
            profileLetterRepository.save(existing)
        } else {
            if (profileLetterRepository.findAllByAccountId(accountId).size >= ProfileLetter.MAX_PER_MEMBER) {
                throw DailyMeetException("편지는 최대 ${ProfileLetter.MAX_PER_MEMBER}통까지 쓸 수 있어요")
            }
            profileLetterRepository.save(ProfileLetter.write(accountId, questionId, content))
        }
        return myLetters(accountId)
    }

    @Transactional
    fun remove(accountId: UUID, questionId: Long): List<ProfileLetterView> {
        profileLetterRepository.findByAccountIdAndQuestionId(accountId, questionId)?.let(profileLetterRepository::delete)
        return myLetters(accountId)
    }

    /** 상대 프로필에 보여줄 편지 목록. */
    @Transactional(readOnly = true)
    fun lettersOf(accountId: UUID): List<ProfileLetterView> = withQuestions(profileLetterRepository.findAllByAccountId(accountId))

    private fun withQuestions(letters: List<ProfileLetter>): List<ProfileLetterView> {
        val questions = questionRepository.findAllOrdered().associateBy { it.id }
        return letters.mapNotNull { letter ->
            questions[letter.questionId]?.let { ProfileLetterView(letter.questionId, it.content, letter.content) }
        }
    }
}
