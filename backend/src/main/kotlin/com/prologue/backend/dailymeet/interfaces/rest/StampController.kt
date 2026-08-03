package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.StampService
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class StampBalanceResponse(val balance: Int)

data class StampHistoryItem(val amount: Int, val reason: String, val createdAt: java.time.Instant)

data class StampWalletResponse(val balance: Int, val history: List<StampHistoryItem>)

/** 우표(재화) 조회. 인증 필요(JWT). 충전 엔드포인트는 출시 직전 IAP와 함께 붙는다. */
@RestController
@RequestMapping("/stamps")
class StampController(
    private val stampService: StampService,
) {
    @GetMapping
    fun balance(authentication: Authentication): StampBalanceResponse =
        StampBalanceResponse(stampService.balance(UUID.fromString(authentication.name)))

    /** 지갑 화면 — 잔액 + 최근 증감 내역(최신순, 최대 50건). */
    @GetMapping("/wallet")
    fun wallet(authentication: Authentication): StampWalletResponse {
        val view = stampService.wallet(UUID.fromString(authentication.name))
        return StampWalletResponse(
            balance = view.balance,
            history = view.history.map { StampHistoryItem(it.amount, it.reason, it.createdAt) },
        )
    }
}
