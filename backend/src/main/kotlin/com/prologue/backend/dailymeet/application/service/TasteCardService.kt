package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.TasteAffinity
import com.prologue.backend.dailymeet.domain.model.TasteCard
import com.prologue.backend.dailymeet.domain.model.TasteChoice
import com.prologue.backend.dailymeet.domain.model.TasteOption
import com.prologue.backend.dailymeet.domain.repository.TasteCardRepository
import com.prologue.backend.dailymeet.domain.repository.TasteChoiceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 취향 카드 — 둘 중 하나를 고르는 가벼운 문답.
 *
 * 오늘의 문답([DailyAnswerService])이 하루 한 번의 글이라면, 이쪽은 언제든 몇 장이든 넘길 수 있는
 * 더미다. 가입 직후 백지 앞에 세워지는 대신 카드 몇 장을 넘기며 시작할 수 있게 하려고 만들었다.
 *
 * **잉크는 주지 않는다.** 잉크는 이 앱의 공급(서술형 답)에 대한 보상이다. 탭 한 번에 잉크가 고이면
 * 아무도 쓰지 않게 되고, 그러면 읽을 것이 없어 만날 이유도 사라진다.
 * 카드가 돌려주는 것은 잉크가 아니라 **더 맞는 상대**다([TasteAffinity]가 매칭 점수에 실린다).
 *
 * 소개를 여는 열쇠도 여전히 서술형 답이다 — "쓰면 만난다"는 리듬은 카드가 건드리지 않는다.
 */
@Service
class TasteCardService(
    private val tasteCardRepository: TasteCardRepository,
    private val tasteChoiceRepository: TasteChoiceRepository,
) {
    /**
     * 아직 안 고른 카드 한 묶음.
     *
     * 무작위로 섞지 않고 id 순으로 낸다. 모두가 같은 순서로 넘기면 앞쪽 카드에 답이 가장 많이
     * 쌓이고, 그래야 두 사람이 **같이 답한 카드**가 생긴다 — 겹치는 카드가 없으면 취향 점수는
     * 계산할 것이 없다([TasteAffinity.MIN_SHARED]).
     */
    @Transactional(readOnly = true)
    fun deck(accountId: UUID, limit: Int = DECK_SIZE): TasteDeckView {
        val cards = tasteCardRepository.findAllOrdered()
        val mine = tasteChoiceRepository.findAllByAccountId(accountId).associateBy { it.cardId }
        return TasteDeckView(
            cards = cards.filter { it.id !in mine.keys }.take(limit.coerceIn(1, MAX_DECK_SIZE)).map { it.toView(null) },
            answered = mine.size,
            total = cards.size,
        )
    }

    /** 카드 한 장을 고른다(수정 포함). 한 줄([note])은 선택이다. */
    @Transactional
    fun choose(accountId: UUID, cardId: Long, option: TasteOption, note: String?): TasteDeckProgress {
        val cards = tasteCardRepository.findAllOrdered()
        if (cards.none { it.id == cardId }) throw DailyMeetException("없는 카드예요")
        val existing = tasteChoiceRepository.findByAccountIdAndCardId(accountId, cardId)
        val choice = existing?.apply { revise(option, note) }
            ?: TasteChoice.choose(accountId, cardId, option, note)
        tasteChoiceRepository.save(choice)
        // 방금 고른 것까지 세어 돌려준다 — 화면의 진행 표시가 한 장씩 밀리지 않게.
        val answered = tasteChoiceRepository.findAllByAccountId(accountId).size
        return TasteDeckProgress(answered = answered, total = cards.size)
    }

    /** 내가 고른 카드 전부 — 최근에 고른 순. 본인 전용 기록. */
    @Transactional(readOnly = true)
    fun mine(accountId: UUID): List<MyTasteView> {
        val cardById = tasteCardRepository.findAllOrdered().associateBy { it.id }
        return tasteChoiceRepository.findAllByAccountId(accountId)
            .sortedByDescending { it.createdAt }
            .mapNotNull { choice ->
                val card = cardById[choice.cardId] ?: return@mapNotNull null
                MyTasteView(
                    cardId = card.id,
                    prompt = card.prompt,
                    choice = card.labelOf(choice.option),
                    note = choice.note,
                    chosenAt = choice.createdAt,
                )
            }
    }

    /** 한 사람의 선택을 카드 id → 선택지로. 매칭 점수([TasteAffinity])가 쓰는 모양. */
    @Transactional(readOnly = true)
    fun optionsOf(accountId: UUID): Map<Long, TasteOption> =
        tasteChoiceRepository.findAllByAccountId(accountId).associate { it.cardId to it.option }

    /** 여러 사람 몫을 한 번에 — 후보마다 따로 읽으면 사람 수만큼 쿼리가 나간다. */
    @Transactional(readOnly = true)
    fun optionsOf(accountIds: Collection<UUID>): Map<UUID, Map<Long, TasteOption>> =
        tasteChoiceRepository.findAllByAccountIds(accountIds)
            .groupBy { it.accountId }
            .mapValues { (_, choices) -> choices.associate { it.cardId to it.option } }

    /**
     * 둘이 똑같이 고른 카드 몇 장 — 상대 카드에 "둘 다 이걸 골랐어요"로 걸린다.
     *
     * 점수는 뒤에서 조용히 순서를 바꾸지만, 사람이 보는 건 이 목록이다. 취향 카드를 넘긴 값이
     * 화면에 보이지 않으면 아무도 두 번 넘기지 않는다. 상대가 덧붙인 한 줄도 함께 — 고른 값보다
     * 그 한 줄이 사람을 알게 한다.
     */
    @Transactional(readOnly = true)
    fun sharedWith(viewerAccountId: UUID, peerAccountId: UUID, limit: Int = SHARED_LIMIT): List<SharedTasteView> {
        val mine = optionsOf(viewerAccountId)
        if (mine.isEmpty()) return emptyList()
        val peerChoices = tasteChoiceRepository.findAllByAccountId(peerAccountId).associateBy { it.cardId }
        val agreed = TasteAffinity.agreedCardIds(mine, peerChoices.mapValues { it.value.option })
        if (agreed.isEmpty()) return emptyList()
        val cardById = tasteCardRepository.findAllOrdered().associateBy { it.id }
        return agreed.mapNotNull { cardId ->
            val card = cardById[cardId] ?: return@mapNotNull null
            val choice = peerChoices[cardId] ?: return@mapNotNull null
            SharedTasteView(
                cardId = card.id,
                prompt = card.prompt,
                choice = card.labelOf(choice.option),
                peerNote = choice.note,
            )
        }
            // 한 줄을 덧붙인 카드를 앞에 — 같은 선택보다 그 사람의 말이 먼저 보여야 한다.
            .sortedByDescending { it.peerNote != null }
            .take(limit)
    }

    private fun TasteCard.toView(choice: TasteChoice?): TasteCardView = TasteCardView(
        id = id,
        prompt = prompt,
        optionA = optionA,
        optionB = optionB,
        myOption = choice?.option,
        myNote = choice?.note,
    )

    companion object {
        /** 한 번에 내려주는 카드 수. 온보딩에서 한 자리에 앉아 넘길 만한 분량. */
        const val DECK_SIZE = 12
        private const val MAX_DECK_SIZE = 50
        private const val SHARED_LIMIT = 5
    }
}

/** 아직 안 고른 카드 한 묶음과 지금까지의 진행. */
data class TasteDeckView(
    val cards: List<TasteCardView>,
    val answered: Int,
    val total: Int,
)

data class TasteCardView(
    val id: Long,
    val prompt: String,
    val optionA: String,
    val optionB: String,
    /** 이미 고른 카드면 내 선택(더미에는 안 실리고, 기록 조회에서 쓴다). */
    val myOption: TasteOption?,
    val myNote: String?,
)

data class TasteDeckProgress(val answered: Int, val total: Int)

/** 내가 고른 카드 하나 — 물음과 내가 고른 쪽, 덧붙인 한 줄. */
data class MyTasteView(
    val cardId: Long,
    val prompt: String,
    val choice: String,
    val note: String?,
    val chosenAt: Instant,
)

/** 상대와 똑같이 고른 카드 하나. [peerNote]는 상대가 덧붙인 한 줄(없을 수 있다). */
data class SharedTasteView(
    val cardId: Long,
    val prompt: String,
    val choice: String,
    val peerNote: String?,
)
