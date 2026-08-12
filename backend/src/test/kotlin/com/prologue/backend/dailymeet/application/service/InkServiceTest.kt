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
        assertEquals(InkPrice.MAIL / 2, InkPrice.MAIL_RECALL_REFUND)
    }




    @Test
    fun `잔액이 없으면 소모할 수 없다`() {
        val wallet = InkWallet.reconstitute(me, InkPrice.MAIL - 1, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet

        assertFailsWith<DailyMeetException> { service.spend(me, InkPrice.MAIL, InkService.REASON_MAIL) }
        verify(exactly = 0) { ledgerRepository.append(any(), any(), any()) }
    }
}
