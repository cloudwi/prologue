package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.ProfileUnlock
import java.util.UUID

interface ProfileUnlockRepository {
    /**
     * 새로 열렸으면 true, 이미 열려 있었으면 false.
     * 우표는 true일 때만 나간다 — 판정을 조회가 아니라 유니크 제약에 맡겨야
     * 같은 순간에 들어온 두 요청이 두 번 차감하지 않는다.
     */
    fun saveIfNew(unlock: ProfileUnlock): Boolean

    /** 이 사용자가 우표로 열어둔 상대들. 목록 화면이 한 번에 판정할 수 있도록 집합으로. */
    fun findPeerAccountIds(accountId: UUID): Set<UUID>
}
