package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Heart
import com.prologue.backend.dailymeet.domain.model.Match
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.HeartRepository
import com.prologue.backend.dailymeet.domain.repository.MatchRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 하트(호감) 유스케이스. 익명 상대 답변(peerAnswerId)에 하트를 보내고,
 * 상대도 나에게 하트를 보냈다면 매칭이 성립한다.
 */
@Service
class HeartService(
    private val answerRepository: AnswerRepository,
    private val heartRepository: HeartRepository,
    private val matchRepository: MatchRepository,
) {
    /** 상대 답변에 하트를 보낸다. 상호 하트면 매칭 성립(멱등). */
    @Transactional
    fun heart(fromAccountId: UUID, peerAnswerId: UUID): HeartResult {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val toAccountId = peerAnswer.accountId
        val questionId = peerAnswer.questionId
        if (fromAccountId == toAccountId) throw DailyMeetException("자신에게는 하트를 보낼 수 없어요")

        if (!heartRepository.exists(fromAccountId, toAccountId, questionId)) {
            heartRepository.save(Heart.send(fromAccountId, toAccountId, questionId))
        }

        val mutual = heartRepository.exists(toAccountId, fromAccountId, questionId)
        if (mutual) {
            val match = Match.between(fromAccountId, toAccountId, questionId)
            if (!matchRepository.exists(match.accountLow, match.accountHigh, questionId)) {
                matchRepository.save(match)
            }
        }
        return HeartResult(matched = mutual)
    }
}

data class HeartResult(val matched: Boolean)
