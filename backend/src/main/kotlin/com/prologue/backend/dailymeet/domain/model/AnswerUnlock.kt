package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 잉크로 산 **하루치 문답 열람권**. 한 번 사면 다시 닫히지 않는다.
 *
 * 블라인드 규칙은 원래 "그 질문에 답해야 그 질문의 상대 답이 열린다"였다. 이건 그 규칙을
 * 돈으로 대신하는 길이고, 그래서 단위도 사람이 아니라 **질문**이다 — 답을 쓰면 그날의 답이
 * 전부 열리듯, 열람권도 그날의 답을 연다. 사람 단위로 팔면 같은 하루를 여러 번 사게 된다.
 *
 * 같은 (account_id, question_id)는 DB 유니크 제약이 막는다([ProfileUnlock]과 같은 이유) —
 * 중복 지급이 아니라 중복 **차감**이라, 놓치면 유저가 손해를 본다.
 */
class AnswerUnlock private constructor(
    val id: UUID,
    val accountId: UUID,
    val questionId: Long,
    val createdAt: Instant,
) {
    companion object {
        fun open(accountId: UUID, questionId: Long, now: Instant = Instant.now()): AnswerUnlock =
            AnswerUnlock(UUID.randomUUID(), accountId, questionId, now)

        fun reconstitute(id: UUID, accountId: UUID, questionId: Long, createdAt: Instant) =
            AnswerUnlock(id, accountId, questionId, createdAt)
    }
}
