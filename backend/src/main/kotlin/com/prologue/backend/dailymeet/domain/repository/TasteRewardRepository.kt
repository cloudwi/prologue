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
    /** 새 지점이면 true(한 장 적립), 이미 받은 지점이면 false. 판정은 유니크 제약이 한다. */
    fun claimIfNew(accountId: UUID, milestone: Int): Boolean

    /**
     * [since] 이후에 적립한 표의 수 — 하루치 상한([TasteReward.DAILY_LIMIT])을 재는 자.
     * 되풀이되는 보상이라 상한이 없으면 하루에 백 장을 넘겨 열 명을 받아 갈 수 있다.
     */
    fun claimedSince(accountId: UUID, since: java.time.Instant): Int

    /** 아직 소개로 바뀌지 않은 표의 수. */
    fun pendingCount(accountId: UUID): Int

    /** 오래된 표부터 [count]장을 쓴 것으로 표시한다. */
    fun markGranted(accountId: UUID, count: Int)
}
