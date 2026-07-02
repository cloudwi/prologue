package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 하트(호감 표시) 유스케이스. 익명 상대 답변(peerAnswerId)에 가벼운 호감을 표시한다.
 * (연결은 '대화 신청'으로 별도 — 하트는 매칭 트리거가 아니다.)
 */
@Service
class HeartService(
    private val answerRepository: AnswerRepository,
    private val heartRepository: HeartRepository,
) {
    /** 상대 답변에 하트(호감)를 보낸다. 멱등. */
    @Transactional
    fun heart(fromAccountId: UUID, peerAnswerId: UUID): HeartResult {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val toAccountId = peerAnswer.accountId
        if (fromAccountId == toAccountId) throw DailyMeetException("자신에게는 하트를 보낼 수 없어요")

        if (!heartRepository.exists(fromAccountId, toAccountId, peerAnswer.questionId)) {
            heartRepository.save(Heart.send(fromAccountId, toAccountId, peerAnswer.questionId))
        }
        return HeartResult(hearted = true)
    }
}

data class HeartResult(val hearted: Boolean)
