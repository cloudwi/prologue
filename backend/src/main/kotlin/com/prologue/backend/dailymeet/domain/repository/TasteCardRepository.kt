package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.TasteCard

interface TasteCardRepository {
    /** id 오름차순 전체 카드. 더미의 순서는 모두에게 같다. */
    fun findAllOrdered(): List<TasteCard>
}
