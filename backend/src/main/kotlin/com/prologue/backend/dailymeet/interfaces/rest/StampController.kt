package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.StampService
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class StampBalanceResponse(val balance: Int)

/** 우표(재화) 조회. 인증 필요(JWT). 충전 엔드포인트는 출시 직전 IAP와 함께 붙는다. */
@RestController
@RequestMapping("/stamps")
class StampController(
    private val stampService: StampService,
) {
    @GetMapping
    fun balance(authentication: Authentication): StampBalanceResponse =
        StampBalanceResponse(stampService.balance(UUID.fromString(authentication.name)))
}
