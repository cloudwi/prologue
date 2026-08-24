package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.member.application.service.BlockService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * 지인 차단 — 전화번호·같은 회사 기준으로 오늘의 상대에서 서로를 숨긴다.
 * 변경 요청은 모두 갱신된 전체 뷰를 돌려준다 — 화면이 별도 재조회 없이 최신 상태가 되도록.
 */
@RestController
@RequestMapping("/members/me/blocks")
class BlockController(
    private val blockService: BlockService,
) {
    data class PhoneBody(@field:NotBlank(message = "전화번호를 입력해주세요") val phone: String)
    data class SameCompanyBody(val enabled: Boolean)

    @GetMapping
    fun view(authentication: Authentication): BlockService.BlocksView =
        blockService.view(UUID.fromString(authentication.name))

    @PostMapping("/phones")
    fun addPhone(authentication: Authentication, @Valid @RequestBody body: PhoneBody): BlockService.BlocksView {
        val accountId = UUID.fromString(authentication.name)
        blockService.addPhone(accountId, body.phone)
        return blockService.view(accountId)
    }

    @DeleteMapping("/phones/{phoneHash}")
    fun removePhone(authentication: Authentication, @PathVariable phoneHash: String): BlockService.BlocksView {
        val accountId = UUID.fromString(authentication.name)
        blockService.removePhone(accountId, phoneHash)
        return blockService.view(accountId)
    }

    @PutMapping("/same-company")
    fun setSameCompany(authentication: Authentication, @RequestBody body: SameCompanyBody): BlockService.BlocksView {
        val accountId = UUID.fromString(authentication.name)
        blockService.setSameCompany(accountId, body.enabled)
        return blockService.view(accountId)
    }
}
