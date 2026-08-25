package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.AccountStatus
import com.prologue.backend.auth.domain.model.Role
import com.prologue.backend.auth.domain.repository.AccountRepository
import io.mockk.every
import io.mockk.mockk
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * 모임을 열 수 있는 사람 — 잘못 만들면 조용히 전체 공개가 되는 종류의 규칙이라 못을 박아 둔다.
 */
class MeetupHostPolicyTest {

    private val accountRepository = mockk<AccountRepository>()
    private val operator = UUID.randomUUID()
    private val other = UUID.randomUUID()

    private fun account(id: UUID, email: String) = Account.reconstitute(
        AccountId(id), email, AccountStatus.ACTIVE, setOf(Role.USER), Instant.now(),
    )

    private fun policy(emails: String) = MeetupHostPolicy(accountRepository, emails)

    @Test
    fun `허용목록에 있는 이메일만 모임을 열 수 있다`() {
        every { accountRepository.findById(AccountId(operator)) } returns account(operator, "cloudwi@naver.com")
        every { accountRepository.findById(AccountId(other)) } returns account(other, "someone@example.com")

        val policy = policy("cloudwi@naver.com")

        assertTrue(policy.canHost(operator))
        assertFalse(policy.canHost(other))
    }

    @Test
    fun `허용목록이 비면 제한이 풀린다`() {
        // 기능을 전체 공개할 때 배포 없이 환경변수만 비우면 되도록.
        val policy = policy("")

        assertFalse(policy.restricted)
        assertTrue(policy.canHost(other))
    }

    @Test
    fun `대소문자와 공백은 정규화해서 본다`() {
        every { accountRepository.findById(AccountId(operator)) } returns account(operator, "cloudwi@naver.com")

        assertTrue(policy(" CloudWi@Naver.com , other@x.com ").canHost(operator))
    }

    @Test
    fun `계정을 찾을 수 없으면 열 수 없다`() {
        every { accountRepository.findById(AccountId(other)) } returns null

        assertFalse(policy("cloudwi@naver.com").canHost(other))
    }
}
