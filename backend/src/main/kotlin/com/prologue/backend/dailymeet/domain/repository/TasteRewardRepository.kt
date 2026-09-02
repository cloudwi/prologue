package com.prologue.backend.dailymeet.domain.repository

import java.util.UUID

/**
 * 취향 카드 이정표로 얻은 **추가 소개권**.
 *
 * 표를 따로 두는 이유는 하나다 — 이정표는 한 계정에 한 번뿐인데, 그 한 번이 실제로 소개로
 * 이어졌는지는 그때 후보가 있느냐에 달려 있다. 후보가 없어 빈손이면 표는 남아 있다가
 * 다음에 앱을 열 때 쓰인다. 보상을 약속해 놓고 그날 후보가 없다는 이유로 없던 일로 만들면
 * 그건 보상이 아니다.
 */
interface TasteRewardRepository {
    /** 새 이정표면 true(한 장 적립), 이미 받은 이정표면 false. 판정은 유니크 제약이 한다. */
    fun claimIfNew(accountId: UUID, milestone: Int): Boolean

    /** 아직 소개로 바뀌지 않은 표의 수. */
    fun pendingCount(accountId: UUID): Int

    /** 오래된 표부터 [count]장을 쓴 것으로 표시한다. */
    fun markGranted(accountId: UUID, count: Int)
}
