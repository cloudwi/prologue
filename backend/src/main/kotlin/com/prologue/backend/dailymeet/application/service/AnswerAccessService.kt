package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.AnswerUnlock
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.AnswerUnlockRepository
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 문답 열람 — 그날의 상대 답을 읽을 수 있는가.
 *
 * 규칙은 그대로다: **답하면 읽는다**. 여기서 더하는 건 답하지 않은 날에 대한 값이다 —
 * 못 읽는 대신 잉크를 내면 그날 몫이 열린다. 규칙을 없애는 게 아니라 값을 매기는 것이라,
 * 값([InkPrice.ANSWER_UNLOCK])은 쓰면 고이는 잉크보다 언제나 무겁다.
 *
 * 단위가 사람이 아니라 **질문**인 이유: 답을 쓰면 그 질문에 달린 상대 답이 전부 열린다.
 * 열람권도 같은 단위여야 "산 것"과 "쓴 것"이 같은 값이 된다. 사람 단위로 팔면 같은 하루를
 * 여러 번 사게 되고, 그건 값을 받는 게 아니라 같은 것을 두 번 파는 일이다.
 */
@Service
class AnswerAccessService(
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
    private val answerUnlockRepository: AnswerUnlockRepository,
    private val inkService: InkService,
) {
    /** 잉크로 열어둔 질문들. 목록 화면은 이걸 한 번 읽어 전부 판정한다. */
    @Transactional(readOnly = true)
    fun unlockedQuestions(accountId: UUID): Set<Long> = answerUnlockRepository.findQuestionIds(accountId)

    /**
     * 잉크를 써서 그날의 상대 답을 연다. 한 번 열면 다시 닫히지 않는다.
     *
     * 이미 답을 남긴 질문이면 잉크를 쓰지 않는다 — 지금 공짜로 읽을 수 있는 것을 받고 파는 건
     * 값을 받는 게 아니라 속이는 것이다([ProfileAccessService.unlock]과 같은 원칙).
     * 이미 산 질문에도 다시 받지 않는다(멱등) — 앱이 재시도하거나 버튼이 두 번 눌려도 한 번만 나간다.
     */
    @Transactional
    fun unlock(accountId: UUID, questionId: Long): UnlockResult {
        if (questionRepository.findAllOrdered().none { it.id == questionId }) {
            throw DailyMeetException("없는 질문이에요")
        }
        if (answerRepository.findByAccountIdAndQuestionId(accountId, questionId) != null) {
            // 그날 답을 남겼으면 이미 열려 있다.
            return UnlockResult(spent = false, balance = inkService.balance(accountId))
        }

        // 기록이 먼저다 — 유니크 제약이 중복 차감을 막는 자물쇠라, 잉크가 먼저 나가면
        // 같은 순간에 들어온 두 요청이 두 번 차감되고 기록은 하나만 남을 수 있다.
        val opened = answerUnlockRepository.saveIfNew(AnswerUnlock.open(accountId, questionId))
        if (!opened) return UnlockResult(spent = false, balance = inkService.balance(accountId))

        inkService.spend(accountId, InkPrice.ANSWER_UNLOCK, InkService.REASON_ANSWER_UNLOCK)
        return UnlockResult(spent = true, balance = inkService.balance(accountId))
    }
}
