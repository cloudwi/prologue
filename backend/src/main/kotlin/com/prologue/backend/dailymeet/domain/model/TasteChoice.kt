package com.prologue.backend.dailymeet.domain.model

import java.time.Instant
import java.util.UUID

/**
 * 한 사람이 취향 카드 한 장에 남긴 선택. (accountId, cardId) 당 하나 — 마음이 바뀌면 덮어쓴다.
 *
 * [note]는 선택지 뒤에 붙이는 한 줄이다. **비워도 된다** — 이 카드의 존재 이유가
 * "부담 없이 시작하는 것"인데 한 줄을 강제하면 백지가 작아졌을 뿐 그대로다.
 * 대신 고르고 난 자리에 칸을 열어둔다. 고른 다음의 한 줄은 백지 앞의 한 줄보다 훨씬 쉽고,
 * 그렇게 쓴 한 줄이 오늘의 문답으로 건너가는 첫 걸음이 된다.
 */
class TasteChoice private constructor(
    val accountId: UUID,
    val cardId: Long,
    option: TasteOption,
    note: String?,
    val createdAt: Instant,
) {
    var option: TasteOption = option
        private set

    var note: String? = note
        private set

    fun revise(option: TasteOption, note: String?) {
        this.option = option
        this.note = validateNote(note)
    }

    companion object {
        /** 한 줄이니 한 줄만큼만. 길게 쓰고 싶어진 사람의 자리는 오늘의 문답이다. */
        const val NOTE_MAX_LENGTH = 100

        fun choose(
            accountId: UUID,
            cardId: Long,
            option: TasteOption,
            note: String? = null,
            now: Instant = Instant.now(),
        ): TasteChoice = TasteChoice(accountId, cardId, option, validateNote(note), now)

        fun reconstitute(
            accountId: UUID,
            cardId: Long,
            option: TasteOption,
            note: String?,
            createdAt: Instant,
        ): TasteChoice = TasteChoice(accountId, cardId, option, note, createdAt)

        /** 빈 줄은 없는 것과 같다 — 공백만 남기면 화면에 빈 말풍선이 생긴다. */
        private fun validateNote(note: String?): String? {
            val trimmed = note?.trim()
            if (trimmed.isNullOrBlank()) return null
            if (trimmed.length > NOTE_MAX_LENGTH) {
                throw DailyMeetException("한 줄은 ${NOTE_MAX_LENGTH}자까지 적을 수 있어요")
            }
            return trimmed
        }
    }
}
