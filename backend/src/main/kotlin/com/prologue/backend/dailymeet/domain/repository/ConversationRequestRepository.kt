package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.ConversationRequest
import java.util.UUID

interface ConversationRequestRepository {
    fun save(request: ConversationRequest): ConversationRequest
    fun findById(id: UUID): ConversationRequest?
    fun existsPending(requesterAccountId: UUID, addresseeAccountId: UUID): Boolean
    fun findPendingByAddressee(addresseeAccountId: UUID): List<ConversationRequest>
}
