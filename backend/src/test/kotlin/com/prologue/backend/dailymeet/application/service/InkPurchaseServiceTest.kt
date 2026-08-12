package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.application.port.PurchaseVerificationException
import com.prologue.backend.dailymeet.application.port.PurchaseVerifier
import com.prologue.backend.dailymeet.application.port.VerifiedPurchase
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPurchase
import com.prologue.backend.dailymeet.domain.model.StorePlatform
import com.prologue.backend.dailymeet.domain.repository.InkPurchaseRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class InkPurchaseServiceTest {

    private val verifier = mockk<PurchaseVerifier>()
    private val purchaseRepository = mockk<InkPurchaseRepository>()
    private val inkService = mockk<InkService>(relaxed = true)
    private val service = InkPurchaseService(verifier, purchaseRepository, inkService)

    private val accountId = UUID.randomUUID()
    private val token = "purchase-token-abc"

    private fun verified(productId: String = "ink_150", txn: String = "txn-1") =
        VerifiedPurchase(transactionId = txn, productId = productId)

    @Test
    fun `검증된 결제는 상품에 정해진 만큼 잉크를 지급한다`() {
        every { verifier.verify(StorePlatform.ANDROID, "ink_150", token) } returns verified()
        every { purchaseRepository.saveIfNew(any()) } returns true
        every { inkService.balance(accountId) } returns 18

        val result = service.purchase(accountId, StorePlatform.ANDROID, "ink_150", token)

        assertEquals(150, result.granted)
        assertEquals(18, result.balance)
        assertFalse(result.alreadyProcessed)
        verify(exactly = 1) { inkService.grantTo(accountId, 150, InkService.REASON_PURCHASE) }
    }

    @Test
    fun `이미 처리한 거래는 다시 지급하지 않고 성공으로 답한다`() {
        // 실패로 답하면 앱이 거래를 소비하지 못해 영원히 재시도한다.
        every { verifier.verify(any(), any(), any()) } returns verified()
        every { purchaseRepository.saveIfNew(any()) } returns false
        every { inkService.balance(accountId) } returns 18

        val result = service.purchase(accountId, StorePlatform.ANDROID, "ink_150", token)

        assertTrue(result.alreadyProcessed)
        assertEquals(0, result.granted)
        assertEquals(18, result.balance)
        verify(exactly = 0) { inkService.grantTo(any(), any(), any()) }
    }

    @Test
    fun `스토어가 확인해주지 못한 결제는 지급하지 않는다`() {
        every { verifier.verify(any(), any(), any()) } throws PurchaseVerificationException("확인 실패")

        assertFailsWith<DailyMeetException> {
            service.purchase(accountId, StorePlatform.ANDROID, "ink_150", token)
        }
        verify(exactly = 0) { inkService.grantTo(any(), any(), any()) }
        verify(exactly = 0) { purchaseRepository.saveIfNew(any()) }
    }

    @Test
    fun `모르는 상품 id는 스토어에 묻기도 전에 거절한다`() {
        assertFailsWith<DailyMeetException> {
            service.purchase(accountId, StorePlatform.ANDROID, "ink_9999", token)
        }
        verify(exactly = 0) { verifier.verify(any(), any(), any()) }
        verify(exactly = 0) { inkService.grantTo(any(), any(), any()) }
    }

    @Test
    fun `스토어가 알려준 상품이 요청과 다르면 지급하지 않는다`() {
        // 싼 상품을 사고 비싼 상품 id를 보내는 시도를 막는다.
        every { verifier.verify(any(), any(), any()) } returns verified(productId = "ink_50")

        assertFailsWith<DailyMeetException> {
            service.purchase(accountId, StorePlatform.ANDROID, "ink_250", token)
        }
        verify(exactly = 0) { inkService.grantTo(any(), any(), any()) }
    }

    @Test
    fun `지급은 기록이 남은 뒤에만 일어난다`() {
        // 기록의 유니크 제약이 중복 지급을 막는 자물쇠다 — 지급이 먼저면 그 사이 두 번 나갈 수 있다.
        every { verifier.verify(any(), any(), any()) } returns verified(productId = "ink_50", txn = "txn-42")
        val saved = slot<InkPurchase>()
        every { purchaseRepository.saveIfNew(capture(saved)) } returns true
        every { inkService.balance(accountId) } returns 5

        service.purchase(accountId, StorePlatform.IOS, "ink_50", token)

        assertEquals("txn-42", saved.captured.transactionId)
        assertEquals(StorePlatform.IOS, saved.captured.platform)
        assertEquals(50, saved.captured.ink)
    }
}
