package com.prologue.backend.dailymeet.interfaces.rest.dto

import com.prologue.backend.dailymeet.application.service.TasteRewardView
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
    val reward: TasteRewardView,
    val sessionId: java.util.UUID? = null,
    val resetsAt: Instant? = null,
) {
    data class Card(
        val id: Long,
        val prompt: String,
        val optionA: String,
        val optionB: String,
        val options: List<Option>,
    )

    data class Option(val id: TasteOption, val label: String)

    companion object {
        fun from(view: TasteDeckView): TasteDeckResponse = TasteDeckResponse(
            cards = view.cards.map { Card(it.id, it.prompt, it.optionA, it.optionB, listOfNotNull(
                Option(TasteOption.A, it.optionA), Option(TasteOption.B, it.optionB),
                it.optionC?.let { label -> Option(TasteOption.C, label) },
                it.optionD?.let { label -> Option(TasteOption.D, label) },
            )) },
            answered = view.answered,
            total = view.total,
            reward = view.reward,
            sessionId = view.sessionId,
            resetsAt = view.resetsAt,
        )
    }
}

/** 카드 선택. [note]는 선택지 뒤에 덧붙이는 한 줄 — 없어도 된다. */
data class TasteChoiceRequest(
    val option: TasteOption,
    @field:Size(max = TasteChoice.NOTE_MAX_LENGTH, message = "한 줄은 ${TasteChoice.NOTE_MAX_LENGTH}자까지 적을 수 있어요")
    val note: String? = null,
    val sessionId: java.util.UUID? = null,
)

data class TasteProgressResponse(
    val answered: Int,
    val total: Int,
    /** 이번 장으로 이정표를 밟았는지 — 추가 소개 조건을 달성했다는 뜻. */
    val milestoneReached: Boolean,
    /** 추가 상대가 도착했는지. 후보가 없으면 이후 자동으로 소개한다. */
    val peerArrived: Boolean,
    val reward: TasteRewardView? = null,
    val selectedPercentage: Int? = null,
    val optionPercentages: Map<TasteOption, Int>? = null,
) {
    companion object {
        fun from(progress: TasteDeckProgress, peerArrived: Boolean): TasteProgressResponse =
            TasteProgressResponse(progress.answered, progress.total, progress.milestoneReached, peerArrived, progress.reward, progress.selectedPercentage, progress.optionPercentages)
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
        val version: Int,
    )

    companion object {
        fun from(views: List<MyTasteView>): MyTastesResponse =
            MyTastesResponse(views.map { Item(it.cardId, it.prompt, it.choice, it.note, it.chosenAt, it.version) })
    }
}
