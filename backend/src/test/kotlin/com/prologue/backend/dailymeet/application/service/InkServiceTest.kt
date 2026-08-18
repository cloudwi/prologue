package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.InkWallet
import com.prologue.backend.dailymeet.domain.repository.InkLedgerRepository
import com.prologue.backend.dailymeet.domain.repository.InkWalletRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class InkServiceTest {

    private val walletRepository = mockk<InkWalletRepository>()
    private val ledgerRepository = mockk<InkLedgerRepository>(relaxed = true)
    private val service = InkService(walletRepository, ledgerRepository)

    private val me = UUID.randomUUID()

    @Test
    fun `지갑이 없으면 환영 잉크와 함께 열린다`() {
        every { walletRepository.findByAccountId(me) } returns null
        val saved = slot<InkWallet>()
        every { walletRepository.save(capture(saved)) } answers { saved.captured }

        assertEquals(InkPrice.WELCOME, service.balance(me))
        verify { ledgerRepository.append(me, InkPrice.WELCOME, InkService.REASON_WELCOME) }
    }

    @Test
    fun `소모하면 잔액이 줄고 원장에 남는다`() {
        val wallet = InkWallet.reconstitute(me, 120, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet
        every { walletRepository.save(any()) } answers { firstArg() }

        service.spend(me, InkPrice.MAIL, InkService.REASON_MAIL)

        assertEquals(120 - InkPrice.MAIL, wallet.ink)
        verify { ledgerRepository.append(me, -InkPrice.MAIL, InkService.REASON_MAIL) }
    }

    @Test
    fun `편지 회수 환급은 부친 값의 절반이다`() {
        // 전액이면 뿌리고 되거두는 게 공짜가 되고, 한 푼도 안 주면 읽지도 않은 값을 그대로 잃는다.
        assertEquals(InkPrice.MAIL / 2, InkPrice.recallRefund(InkPrice.MAIL))
        assertEquals(InkPrice.MAIL_MUTUAL / 2, InkPrice.recallRefund(InkPrice.MAIL_MUTUAL))
    }

    @Test
    fun `상호 하트 편지값은 정가의 30% 할인이다`() {
        assertEquals(35, InkPrice.MAIL_MUTUAL)
    }

    @Test
    fun `오늘의 답변 보상 - 오늘 처음이면 지급하고 원장에 남긴다`() {
        val wallet = InkWallet.reconstitute(me, 10, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet
        every { walletRepository.save(any()) } answers { firstArg() }
        every { ledgerRepository.latestAt(me, InkService.REASON_ANSWER) } returns null

        assertEquals(InkPrice.DAILY_ANSWER, service.rewardDailyAnswer(me))
        assertEquals(10 + InkPrice.DAILY_ANSWER, wallet.ink)
        verify { ledgerRepository.append(me, InkPrice.DAILY_ANSWER, InkService.REASON_ANSWER) }
    }

    @Test
    fun `오늘의 답변 보상 - 오늘 이미 받았으면 0`() {
        val wallet = InkWallet.reconstitute(me, 10, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet
        every { ledgerRepository.latestAt(me, InkService.REASON_ANSWER) } returns Instant.now()

        assertEquals(0, service.rewardDailyAnswer(me))
        assertEquals(10, wallet.ink)
        verify(exactly = 0) { ledgerRepository.append(me, InkPrice.DAILY_ANSWER, InkService.REASON_ANSWER) }
    }

    @Test
    fun `오늘의 답변 보상 - 어제 받았으면 오늘 다시 준다`() {
        val wallet = InkWallet.reconstitute(me, 10, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet
        every { walletRepository.save(any()) } answers { firstArg() }
        every { ledgerRepository.latestAt(me, InkService.REASON_ANSWER) } returns Instant.now().minusSeconds(48 * 3600)

        assertEquals(InkPrice.DAILY_ANSWER, service.rewardDailyAnswer(me))
    }




    @Test
    fun `잔액이 없으면 소모할 수 없다`() {
        val wallet = InkWallet.reconstitute(me, InkPrice.MAIL - 1, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet

        assertFailsWith<DailyMeetException> { service.spend(me, InkPrice.MAIL, InkService.REASON_MAIL) }
        verify(exactly = 0) { ledgerRepository.append(any(), any(), any()) }
    }
}
