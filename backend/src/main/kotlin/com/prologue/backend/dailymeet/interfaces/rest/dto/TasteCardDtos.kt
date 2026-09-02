package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.MyTasteView
import com.prologue.backend.dailymeet.application.service.TasteDeckProgress
import com.prologue.backend.dailymeet.application.service.TasteDeckView
import com.prologue.backend.dailymeet.domain.model.TasteChoice
import com.prologue.backend.dailymeet.domain.model.TasteOption
import jakarta.validation.constraints.Size
import java.time.Instant

/** 아직 안 고른 카드 한 묶음 + 진행. */
data class TasteDeckResponse(
    val cards: List<Card>,
    val answered: Int,
    val total: Int,
) {
    data class Card(
        val id: Long,
        val prompt: String,
        val optionA: String,
        val optionB: String,
    )

    companion object {
        fun from(view: TasteDeckView): TasteDeckResponse = TasteDeckResponse(
            cards = view.cards.map { Card(it.id, it.prompt, it.optionA, it.optionB) },
            answered = view.answered,
            total = view.total,
        )
    }
}

/** 카드 선택. [note]는 선택지 뒤에 덧붙이는 한 줄 — 없어도 된다. */
data class TasteChoiceRequest(
    val option: TasteOption,
    @field:Size(max = TasteChoice.NOTE_MAX_LENGTH, message = "한 줄은 ${TasteChoice.NOTE_MAX_LENGTH}자까지 적을 수 있어요")
    val note: String? = null,
)

data class TasteProgressResponse(
    val answered: Int,
    val total: Int,
    /** 이번 장으로 이정표를 밟았는지 — 추가 소개권 한 장이 적립됐다는 뜻. */
    val milestoneReached: Boolean,
    /** 그 표가 그 자리에서 소개로 바뀌었는지. 후보가 없으면 false고, 표는 남아 다음에 쓰인다. */
    val peerArrived: Boolean,
) {
    companion object {
        fun from(progress: TasteDeckProgress, peerArrived: Boolean): TasteProgressResponse =
            TasteProgressResponse(progress.answered, progress.total, progress.milestoneReached, peerArrived)
    }
}

/** 내가 고른 카드 목록 — 본인 전용, 최근 순. */
data class MyTastesResponse(val tastes: List<Item>) {
    data class Item(
        val cardId: Long,
        val prompt: String,
        val choice: String,
        val note: String?,
        val chosenAt: Instant,
    )

    companion object {
        fun from(views: List<MyTasteView>): MyTastesResponse =
            MyTastesResponse(views.map { Item(it.cardId, it.prompt, it.choice, it.note, it.chosenAt) })
    }
}
