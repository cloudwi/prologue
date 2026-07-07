package com.prologue.backend.auth.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AccountTest {

    private val credential = EmailCredential("user@example.com", "hashed-pw")

    @Test
    fun `register는 ACTIVE USER 계정을 이메일 자격증명과 함께 생성한다`() {
        val account = Account.register(credential)

        assertEquals(AccountStatus.ACTIVE, account.status)
        assertEquals(setOf(Role.USER), account.roles)
        assertEquals(credential, account.credential)
        assertEquals("user@example.com", account.email)
    }

    @Test
    fun `suspend 후 reactivate로 다시 활성화된다`() {
        val account = Account.register(credential)

        account.suspend()
        assertFalse(account.isActive())

        account.reactivate()
        assertTrue(account.isActive())
    }

    @Test
    fun `탈퇴 계정은 정지할 수 없다`() {
        val account = Account.register(credential)
        account.withdraw()

        assertFailsWith<AuthDomainException> { account.suspend() }
    }

    @Test
    fun `정지 상태가 아닌 계정은 reactivate할 수 없다`() {
        val account = Account.register(credential)

        assertFailsWith<AuthDomainException> { account.reactivate() }
    }

    @Test
    fun `email이 정규화되지 않았으면 EmailCredential 생성 실패`() {
        assertFailsWith<IllegalArgumentException> {
            EmailCredential("User@Example.com", "hashed-pw")
        }
    }

    @Test
    fun `passwordHash가 비어 있으면 EmailCredential 생성 실패`() {
        assertFailsWith<IllegalArgumentException> {
            EmailCredential("user@example.com", "")
        }
    }

    @Test
    fun `normalizeEmail은 공백을 제거하고 소문자로 변환한다`() {
        assertEquals("user@example.com", EmailCredential.normalizeEmail("  User@Example.COM "))
    }
}
