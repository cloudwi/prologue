package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.StampWallet
import com.prologue.backend.dailymeet.domain.repository.StampLedgerRepository
import com.prologue.backend.dailymeet.domain.repository.StampWalletRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class StampServiceTest {

    private val walletRepository = mockk<StampWalletRepository>()
    private val ledgerRepository = mockk<StampLedgerRepository>(relaxed = true)
    private val service = StampService(walletRepository, ledgerRepository)

    private val me = UUID.randomUUID()

    @Test
    fun `지갑이 없으면 환영 우표와 함께 열린다`() {
        every { walletRepository.findByAccountId(me) } returns null
        val saved = slot<StampWallet>()
        every { walletRepository.save(capture(saved)) } answers { saved.captured }

        assertEquals(StampWallet.WELCOME_STAMPS, service.balance(me))
        verify { ledgerRepository.append(me, StampWallet.WELCOME_STAMPS, StampService.REASON_WELCOME) }
    }

    @Test
    fun `소모하면 잔액이 줄고 원장에 남는다`() {
        val wallet = StampWallet.reconstitute(me, 2, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet
        every { walletRepository.save(any()) } answers { firstArg() }

        service.spendOne(me, StampService.REASON_MAIL)

        assertEquals(1, wallet.balance)
        verify { ledgerRepository.append(me, -1, StampService.REASON_MAIL) }
    }




    @Test
    fun `잔액이 없으면 소모할 수 없다`() {
        val wallet = StampWallet.reconstitute(me, 0, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet

        assertFailsWith<DailyMeetException> { service.spendOne(me, StampService.REASON_MAIL) }
        verify(exactly = 0) { ledgerRepository.append(any(), any(), any()) }
    }
}
