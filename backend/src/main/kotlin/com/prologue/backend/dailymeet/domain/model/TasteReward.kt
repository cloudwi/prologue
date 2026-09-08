package com.prologue.backend.dailymeet.domain.model

/** 카드 10개마다 추가 한 명을 자동 소개한다. 같은 카드 수정은 새 달성으로 세지 않는다. */
object TasteReward {
    const val EVERY = 10

    /** 중복 소개를 막는 내부 이정표. 사용자에게 수령하거나 보유하는 이용권은 없다. */
    fun milestoneAt(answeredCount: Int): Int? =
        if (answeredCount > 0 && answeredCount % EVERY == 0) answeredCount else null
}
