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
    fun `주간 우표 - 이번 주에 안 받았으면 지갑을 여는 순간 1장 채워진다`() {
        val wallet = StampWallet.reconstitute(me, 0, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet
        every { walletRepository.save(any()) } answers { firstArg() }
        every { ledgerRepository.latestAt(me, StampService.REASON_WEEKLY) } returns
            Instant.now().minusSeconds(8 * 24 * 3600) // 지난주
        assertEquals(1, service.balance(me))
        verify { ledgerRepository.append(me, 1, StampService.REASON_WEEKLY) }
    }

    @Test
    fun `주간 우표 - 이번 주에 이미 받았으면 더 주지 않는다`() {
        val wallet = StampWallet.reconstitute(me, 1, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet
        every { ledgerRepository.latestAt(me, StampService.REASON_WEEKLY) } returns Instant.now()

        assertEquals(1, service.balance(me))
        verify(exactly = 0) { ledgerRepository.append(me, 1, StampService.REASON_WEEKLY) }
    }

    @Test
    fun `주간 우표 - 환영 우표를 받은 주는 건너뛴다`() {
        val wallet = StampWallet.reconstitute(me, 3, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet
        every { ledgerRepository.latestAt(me, StampService.REASON_WEEKLY) } returns null
        every { ledgerRepository.latestAt(me, StampService.REASON_WELCOME) } returns Instant.now()

        assertEquals(3, service.balance(me))
        verify(exactly = 0) { ledgerRepository.append(me, 1, StampService.REASON_WEEKLY) }
    }

    @Test
    fun `잔액이 없으면 소모할 수 없다`() {
        val wallet = StampWallet.reconstitute(me, 0, Instant.now(), Instant.now())
        every { walletRepository.findByAccountId(me) } returns wallet

        assertFailsWith<DailyMeetException> { service.spendOne(me, StampService.REASON_MAIL) }
        verify(exactly = 0) { ledgerRepository.append(any(), any(), any()) }
    }
}
