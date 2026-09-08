package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.TasteCard
import com.prologue.backend.dailymeet.domain.model.TasteChoice
import com.prologue.backend.dailymeet.domain.model.TasteOption
import com.prologue.backend.dailymeet.domain.repository.TasteCardRepository
import com.prologue.backend.dailymeet.domain.repository.TasteChoiceRepository
import com.prologue.backend.dailymeet.domain.repository.TasteRewardRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TasteCardServiceTest {

    private val cardRepository = mockk<TasteCardRepository>()
    private val choiceRepository = mockk<TasteChoiceRepository>()
    private val rewardRepository = mockk<TasteRewardRepository> {
        every { claimEarned(any(), any(), any(), any()) } returns false
        every { claimedMilestones(any()) } returns emptyList()
        every { pendingCount(any()) } returns 0
        every { claimedSince(any(), any()) } returns 0 // 오늘 아직 안 받은 상태
    }
    private val service = TasteCardService(cardRepository, choiceRepository, rewardRepository)

    private val accountId = UUID.randomUUID()
    private val peerAccountId = UUID.randomUUID()

    private val cards = listOf(
        TasteCard(1L, "아침의 나는?", "일찍 깬다", "알람을 미룬다"),
        TasteCard(2L, "주말의 기본값은?", "일단 나간다", "집에서 충전한다"),
        TasteCard(3L, "연락은?", "자주 짧게", "가끔 길게"),
    )

    private fun choice(cardId: Long, option: TasteOption, note: String? = null, account: UUID = accountId) =
        TasteChoice.reconstitute(account, cardId, option, note, Instant.now())

    @Test
    fun `더미에는 아직 안 고른 카드만 남는다`() {
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findAllByAccountId(accountId) } returns listOf(choice(1L, TasteOption.A))

        val deck = service.deck(accountId)

        assertEquals(listOf(2L, 3L), deck.cards.map { it.id })
        assertEquals(1, deck.answered)
        assertEquals(3, deck.total)
    }

    @Test
    fun `더미는 모두에게 같은 순서로 나온다`() {
        // 앞쪽 카드에 답이 가장 많이 쌓여야 두 사람이 '같이 답한 카드'가 생긴다 — 섞으면 겹칠 일이 없다.
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findAllByAccountId(accountId) } returns emptyList()

        assertEquals(listOf(1L, 2L, 3L), service.deck(accountId, limit = 3).cards.map { it.id })
    }

    @Test
    fun `없는 카드는 고를 수 없다`() {
        every { cardRepository.findAllOrdered() } returns cards

        assertFailsWith<DailyMeetException> { service.choose(accountId, 99L, TasteOption.A, null) }
    }

    @Test
    fun `다시 고르면 새로 만들지 않고 덮어쓴다`() {
        val existing = choice(1L, TasteOption.A, "아침형이에요")
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findByAccountIdAndCardId(accountId, 1L) } returns existing
        val saved = slot<TasteChoice>()
        every { choiceRepository.save(capture(saved)) } answers { saved.captured }
        every { choiceRepository.findAllByAccountId(accountId) } returns listOf(existing)

        val progress = service.choose(accountId, 1L, TasteOption.B, "역시 밤이에요")

        assertTrue(saved.captured === existing)
        assertEquals(TasteOption.B, saved.captured.option)
        assertEquals("역시 밤이에요", saved.captured.note)
        assertEquals(1, progress.answered)
        assertEquals(3, progress.total)
    }

    @Test
    fun `겹치는 취향에는 같은 선택만 담기고 상대의 한 줄이 함께 온다`() {
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findAllByAccountId(accountId) } returns listOf(
            choice(1L, TasteOption.A),
            choice(2L, TasteOption.B),
            choice(3L, TasteOption.A),
        )
        every { choiceRepository.findAllByAccountId(peerAccountId) } returns listOf(
            choice(1L, TasteOption.A, "새벽이 제일 조용해요", peerAccountId),
            choice(2L, TasteOption.A, account = peerAccountId), // 어긋난 선택 — 담기지 않는다
            choice(3L, TasteOption.A, account = peerAccountId),
        )

        val shared = service.sharedWith(accountId, peerAccountId)

        assertEquals(listOf(1L, 3L), shared.map { it.cardId }.sorted())
        // 한 줄을 덧붙인 카드가 앞에 온다 — 고른 값보다 그 사람의 말이 먼저 보여야 한다.
        assertEquals(1L, shared.first().cardId)
        assertEquals("새벽이 제일 조용해요", shared.first().peerNote)
        assertEquals("일찍 깬다", shared.first().choice)
    }

    @Test
    fun `내가 카드를 하나도 안 넘겼으면 겹치는 취향도 없다`() {
        every { choiceRepository.findAllByAccountId(accountId) } returns emptyList()

        assertTrue(service.sharedWith(accountId, peerAccountId).isEmpty())
    }

    @Test
    fun `이정표에 이르면 추가 소개권이 적립된다`() {
        // 카드가 손에 아무것도 쥐여주지 않으면 두 번 넘길 이유가 없다. 보상은 재화가 아니라 사람이다.
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findByAccountIdAndCardId(accountId, 1L) } returns null
        every { choiceRepository.save(any()) } answers { firstArg() }
        every { choiceRepository.findAllByAccountId(accountId) } returns List(10) { choice(it + 1L, TasteOption.A) }

        every { rewardRepository.claimEarned(accountId, 10, any(), 1) } returns true

        val progress = service.choose(accountId, 1L, TasteOption.A, null)

        assertTrue(progress.milestoneReached)
        verify(exactly = 1) { rewardRepository.claimEarned(accountId, 10, any(), 1) }
    }

    @Test
    fun `이정표가 아니면 아무것도 적립하지 않는다`() {
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findByAccountIdAndCardId(accountId, 1L) } returns null
        every { choiceRepository.save(any()) } answers { firstArg() }
        every { choiceRepository.findAllByAccountId(accountId) } returns listOf(choice(1L, TasteOption.A))

        assertFalse(service.choose(accountId, 1L, TasteOption.A, null).milestoneReached)
        verify(exactly = 1) { rewardRepository.claimEarned(accountId, any(), any(), 1) }
    }

    @Test
    fun `하루에 한 번을 넘겨 받지는 못한다`() {
        // 되풀이되는 보상이라 상한이 없으면 하루에 백 장을 넘겨 열 명을 받아 갈 수 있다.
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findByAccountIdAndCardId(accountId, 1L) } returns null
        every { choiceRepository.save(any()) } answers { firstArg() }
        every { choiceRepository.findAllByAccountId(accountId) } returns List(20) { choice(it + 1L, TasteOption.A) }
        every { rewardRepository.claimedSince(accountId, any()) } returns 1 // 오늘 이미 한 번 받았다

        assertFalse(service.choose(accountId, 1L, TasteOption.A, null).milestoneReached)
        verify(exactly = 1) { rewardRepository.claimEarned(accountId, any(), any(), 1) }
    }

    @Test
    fun `이미 받은 이정표는 다시 적립되지 않는다`() {
        // 카드를 지웠다 다시 고르는 식으로 같은 이정표를 두 번 밟을 수 없다 — 판정은 저장소가 한다.
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findByAccountIdAndCardId(accountId, 1L) } returns null
        every { choiceRepository.save(any()) } answers { firstArg() }
        every { choiceRepository.findAllByAccountId(accountId) } returns List(10) { choice(it + 1L, TasteOption.A) }
        every { rewardRepository.claimEarned(accountId, 10, any(), 1) } returns false

        assertFalse(service.choose(accountId, 1L, TasteOption.A, null).milestoneReached)
    }
    @Test
    fun `개편 더미는 원본 답변과 분리되고 구버전은 두 선택지 카드만 받는다`() {
        val revised = TasteCard(1001, cards[0].prompt, "새 A", "새 B", "새 C", "새 D", 2)
        every { cardRepository.findAllOrdered() } returns cards + revised
        every { choiceRepository.findAllByAccountId(accountId) } returns listOf(choice(1, TasteOption.A))
        val deck = service.deck(accountId, version = 2)
        assertEquals(listOf(1001L), deck.cards.map { it.id })
        assertEquals(0, deck.answered)
        assertEquals(1, deck.total)
        assertEquals(listOf(2L, 3L), service.deck(accountId).cards.map { it.id })
        assertEquals("일찍 깬다", service.mine(accountId).single().choice)
    }

    @Test
    fun `카드에 없는 선택지는 저장 전에 거절한다`() {
        every { cardRepository.findAllOrdered() } returns cards
        assertFailsWith<DailyMeetException> { service.choose(accountId, 1, TasteOption.C, null) }
        verify(exactly = 0) { choiceRepository.save(any()) }
    }

    @Test
    fun `새 선택지 D가 저장되고 기록에 정확한 문구로 나온다`() {
        val revised = TasteCard(1001, "애정은?", "말", "행동", "시간", "스킨십", 2)
        every { cardRepository.findAllOrdered() } returns cards + revised
        every { choiceRepository.findByAccountIdAndCardId(accountId, 1001) } returns null
        every { choiceRepository.save(any()) } answers { firstArg() }
        every { choiceRepository.findAllByAccountId(accountId) } returns listOf(choice(1001, TasteOption.D))
        assertEquals(1, service.choose(accountId, 1001, TasteOption.D, null).answered)
        assertEquals("스킨십", service.mine(accountId).single().choice)
    }

    @Test
    fun `초과 달성 보상과 다음 보상까지 남은 장수를 함께 보여준다`() {
        every { choiceRepository.findAllByAccountId(accountId) } returns List(35) { choice(it + 1L, TasteOption.A) }
        every { rewardRepository.claimedMilestones(accountId) } returns listOf(10)
        every { rewardRepository.pendingCount(accountId) } returns 1
        every { rewardRepository.claimedSince(accountId, any()) } returns 1
        val status = service.rewardStatus(accountId)
        assertEquals(2, status.unclaimed)
        assertEquals(5, status.remaining)
        assertEquals(1, status.pending)
        assertTrue(status.dailyLimitReached)
    }

    @Test
    fun `모든 카드를 마친 뒤에도 남은 보상을 수령할 수 있다`() {
        every { cardRepository.findAllOrdered() } returns cards
        every { choiceRepository.findAllByAccountId(accountId) } returns List(25) { choice(it + 1L, TasteOption.A) }
        every { rewardRepository.claimEarned(accountId, 25, any(), 1) } returns true
        assertTrue(service.claimReward(accountId).milestoneReached)
        verify(exactly = 0) { choiceRepository.save(any()) }
    }

}
