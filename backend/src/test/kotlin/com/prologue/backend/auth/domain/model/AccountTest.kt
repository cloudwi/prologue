package com.prologue.backend.auth.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AccountTest {

    @Test
    fun `register는 ACTIVE USER 계정을 이메일과 함께 생성한다`() {
        val account = Account.register("user@example.com")

        assertEquals(AccountStatus.ACTIVE, account.status)
        assertEquals(setOf(Role.USER), account.roles)
        assertEquals("user@example.com", account.email)
    }

    @Test
    fun `register는 정규화되지 않은 이메일을 거부한다`() {
        assertFailsWith<IllegalArgumentException> { Account.register("User@Example.com") }
    }

    @Test
    fun `suspend 후 reactivate로 다시 활성화된다`() {
        val account = Account.register("user@example.com")

        account.suspend()
        assertFalse(account.isActive())

        account.reactivate()
        assertTrue(account.isActive())
    }

    @Test
    fun `탈퇴 계정은 정지할 수 없다`() {
        val account = Account.register("user@example.com")
        account.withdraw()

        assertFailsWith<AuthDomainException> { account.suspend() }
    }

    @Test
    fun `normalizeEmail은 공백을 제거하고 소문자로 변환한다`() {
        assertEquals("user@example.com", Account.normalizeEmail("  User@Example.COM "))
    }
}
