package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Heart
import java.util.UUID

interface HeartRepository {
    fun save(heart: Heart): Heart
    fun exists(fromAccountId: UUID, toAccountId: UUID, questionId: Long): Boolean

    /** 질문과 무관하게 from→to 하트가 하나라도 있는지. 상호 호감(매칭) 판정에 쓴다. */
    fun existsFromTo(fromAccountId: UUID, toAccountId: UUID): Boolean

    /** 내가 받은 하트 전부, 최신순. */
    fun findAllTo(toAccountId: UUID): List<Heart>

    /** 내가 보낸 하트 수. 일정 개수마다 우표를 돌려주는 보상 기준. */
    fun countFrom(fromAccountId: UUID): Long

    /**
     * 이 사용자와 하트를 주고받은 상대별 마지막 하트 시각(방향 무관).
     *
     * 프로필 열람 창의 시작점 중 하나다. 소개는 한쪽 화면에만 뜨므로 나를 보고 하트만 보낸
     * 상대가 있고, 그 경우 소개 시각만 보면 이어진 적 없는 사람이 된다.
     * 목록 화면이 사람마다 다시 묻지 않도록 한 번에 표로 준다.
     */
    fun findLastHeartedAtByPeer(accountId: UUID): Map<UUID, java.time.Instant>
}
