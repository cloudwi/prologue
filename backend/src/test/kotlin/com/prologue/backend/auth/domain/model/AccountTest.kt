package com.prologue.backend.auth.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AccountTest {

    private val kakao = SocialConnection(SocialProvider.KAKAO, "kakao-123")
    private val google = SocialConnection(SocialProvider.GOOGLE, "google-abc")

    @Test
    fun `register는 ACTIVE USER 계정을 최초 소셜 연결과 함께 생성한다`() {
        val account = Account.register(kakao)

        assertEquals(AccountStatus.ACTIVE, account.status)
        assertEquals(setOf(Role.USER), account.roles)
        assertEquals(listOf(kakao), account.connections)
        assertTrue(account.hasConnection(SocialProvider.KAKAO, "kakao-123"))
    }

    @Test
    fun `다른 제공자를 연결하면 계정에 추가된다`() {
        val account = Account.register(kakao)

        account.linkSocial(google)

        assertEquals(2, account.connections.size)
        assertTrue(account.isLinkedTo(SocialProvider.GOOGLE))
    }

    @Test
    fun `같은 제공자 재연결은 멱등하게 무시된다`() {
        val account = Account.register(kakao)

        account.linkSocial(SocialConnection(SocialProvider.KAKAO, "kakao-different"))

        assertEquals(1, account.connections.size)
        assertTrue(account.hasConnection(SocialProvider.KAKAO, "kakao-123"))
    }

    @Test
    fun `정지된 계정에는 소셜 연결을 추가할 수 없다`() {
        val account = Account.register(kakao)
        account.suspend()

        assertFailsWith<AuthDomainException> { account.linkSocial(google) }
    }

    @Test
    fun `suspend 후 reactivate로 다시 활성화된다`() {
        val account = Account.register(kakao)

        account.suspend()
        assertFalse(account.isActive())

        account.reactivate()
        assertTrue(account.isActive())
    }

    @Test
    fun `탈퇴 계정은 정지할 수 없다`() {
        val account = Account.register(kakao)
        account.withdraw()

        assertFailsWith<AuthDomainException> { account.suspend() }
    }

    @Test
    fun `providerUserId가 비어 있으면 SocialConnection 생성 실패`() {
        assertFailsWith<IllegalArgumentException> {
            SocialConnection(SocialProvider.NAVER, "")
        }
    }
}
