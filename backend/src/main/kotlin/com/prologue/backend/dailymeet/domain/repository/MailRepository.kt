package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Mail
import java.util.UUID

interface MailRepository {
    fun save(mail: Mail): Mail

    fun findById(id: UUID): Mail?

    /** 이미 그 상대에게 편지를 보냈는지 — 한 상대에게는 한 통. */
    fun existsBySenderAndRecipient(senderAccountId: UUID, recipientAccountId: UUID): Boolean

    /** 내가 그 상대에게 보낸 편지 한 통 — 보낸 편지 확인용. */
    fun findBySenderAndRecipient(senderAccountId: UUID, recipientAccountId: UUID): Mail?

    /** 받은 편지, 최신순. */
    fun findAllByRecipient(recipientAccountId: UUID): List<Mail>

    /**
     * 이 사용자와 편지가 오간 상대별 마지막 편지 시각(방향 무관).
     *
     * 프로필 열람 창의 시작점 중 하나다. 편지는 우표를 쓰고 연락처를 건네는 행동이라
     * 소개나 하트보다 강한 신호인데, 이걸 세지 않으면 편지를 받아둔 상대가 사흘 뒤 잠긴다.
     */
    fun findLastMailedAtByPeer(accountId: UUID): Map<UUID, java.time.Instant>
}
