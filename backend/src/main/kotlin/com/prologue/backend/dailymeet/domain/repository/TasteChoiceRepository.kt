package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.TasteChoice
import java.util.UUID

interface TasteChoiceRepository {
    fun findAllByAccountId(accountId: UUID): List<TasteChoice>

    fun findByAccountIdAndCardId(accountId: UUID, cardId: Long): TasteChoice?

    /**
     * 여러 사람의 선택을 한 번에 — 오늘의 상대 후보마다 따로 읽으면 사람 수만큼 쿼리가 나간다.
     * ([PeerMatchingService]가 후보 전원의 취향 겹침을 계산할 때 쓴다.)
     */
    fun findAllByAccountIds(accountIds: Collection<UUID>): List<TasteChoice>

    fun save(choice: TasteChoice): TasteChoice
}
