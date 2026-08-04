package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.Mail
import java.util.UUID

interface MailRepository {
    fun save(mail: Mail): Mail

    /** 이미 그 상대에게 편지를 보냈는지 — 한 상대에게는 한 통. */
    fun existsBySenderAndRecipient(senderAccountId: UUID, recipientAccountId: UUID): Boolean

    /** 받은 편지, 최신순. */
    fun findAllByRecipient(recipientAccountId: UUID): List<Mail>
}
