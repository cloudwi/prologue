package com.prologue.backend.growth

import java.util.UUID

/** Server-confirmed facts only; client PostHog events remain a separate UX diagnostic stream. */
enum class GrowthEvent {
    REGISTERED, ONBOARDED, ANSWER_SUBMITTED, PEER_CHECKED, PEER_AVAILABLE,
    HEART_SENT, MAIL_SENT, MAIL_REPLIED, MAIL_REPLY_RECEIVED, CONTACTS_EXCHANGED, ACTIVE_DAY,
}

fun interface GrowthEvents {
    fun record(accountId: UUID, event: GrowthEvent, source: String)

    companion object {
        /** Keeps isolated domain tests independent from persistence; Spring supplies the real bean. */
        val NONE = GrowthEvents { _, _, _ -> }
    }
}
