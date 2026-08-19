package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.model.AccountStatus
import com.prologue.backend.auth.domain.model.Role
import com.prologue.backend.auth.domain.repository.AccountRepository
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.InviteCode
import com.prologue.backend.dailymeet.domain.model.ReferralPolicy
import com.prologue.backend.dailymeet.domain.repository.InviteCodeRepository
import com.prologue.backend.dailymeet.domain.repository.ReferralRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.notification.application.service.NotificationService
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ReferralServiceTest {

    private val inviteCodeRepository = mockk<InviteCodeRepository>()
    private val referralRepository = mockk<ReferralRepository>()
    private val accountRepository = mockk<AccountRepository>()
    private val memberQueryService = mockk<MemberQueryService>()
    private val inkService = mockk<InkService>(relaxed = true)
    private val notificationService = mockk<NotificationService>(relaxed = true)
    private val service = ReferralService(
        inviteCodeRepository, referralRepository, accountRepository, memberQueryService, inkService, notificationService,
        webBaseUrl = "https://prologue.day",
    )

    private val inviter = UUID.randomUUID()
    private val invitee = UUID.randomUUID()
    private val code = InviteCode.reconstitute(inviter, "P7K3MQ", Instant.now())

    private fun account(id: UUID, createdAt: Instant) =
        Account.reconstitute(AccountId(id), "x@prologue.day", AccountStatus.ACTIVE, setOf(Role.USER), createdAt)

    private fun member(id: UUID) =
        Member.reconstitute(id, "닉", Gender.FEMALE, LocalDate.of(1996, 1, 1), Gender.MALE, "서울", Instant.now(), photoUrls = listOf("a", "b"))

    /** 초대받은 쪽이 막 가입했고 프로필도 있는, 정상 경로의 기본 무대. */
    private fun freshInvitee(createdAgo: Duration = Duration.ofDays(1)) {
        every { inviteCodeRepository.findByCode("P7K3MQ") } returns code
        every { accountRepository.findById(AccountId(invitee)) } returns account(invitee, Instant.now().minus(createdAgo))
        every { memberQueryService.findProfile(invitee) } returns member(invitee)
        every { referralRepository.saveIfNew(any()) } returns true
        every { referralRepository.countByInviter(inviter) } returns 1
    }

    @Test
    fun `내 코드 - 없으면 만들어 두고 다음부터는 같은 코드를 돌려준다`() {
        every { inviteCodeRepository.findByAccountId(inviter) } returns null andThen code
        every { inviteCodeRepository.saveIfCodeFree(any()) } returns true
        every { referralRepository.countByInviter(inviter) } returns 0
        every { referralRepository.existsByInvitee(inviter) } returns false

        val first = service.mine(inviter)
        val second = service.mine(inviter)

        assertEquals(InviteCode.LENGTH, first.code.length)
        assertEquals("P7K3MQ", second.code)
        assertTrue(second.shareUrl.endsWith("/download?ref=P7K3MQ"))
        verify(exactly = 1) { inviteCodeRepository.saveIfCodeFree(any()) }
    }

    @Test
    fun `코드 쓰기 - 둘 다 잉크를 받고 초대한 쪽에는 알림이 간다`() {
        freshInvitee()

        val granted = service.redeem(invitee, " p7k3-mq ") // 소문자·공백·하이픈은 골라 준다

        assertEquals(InkPrice.REFERRAL, granted)
        verify { inkService.grantTo(invitee, InkPrice.REFERRAL, InkService.REASON_REFERRAL) }
        verify { inkService.grantTo(inviter, InkPrice.REFERRAL, InkService.REASON_REFERRAL) }
        verify { notificationService.referralRewarded(inviter, InkPrice.REFERRAL) }
    }

    @Test
    fun `코드 쓰기 - 초대한 쪽은 상한까지만 받고 초대받은 쪽은 계속 받는다`() {
        freshInvitee()
        every { referralRepository.countByInviter(inviter) } returns (ReferralPolicy.MAX_REWARDED_INVITES + 1).toLong()

        service.redeem(invitee, "P7K3MQ")

        verify(exactly = 1) { inkService.grantTo(invitee, InkPrice.REFERRAL, InkService.REASON_REFERRAL) }
        verify(exactly = 0) { inkService.grantTo(inviter, any(), any()) }
    }

    @Test
    fun `코드 쓰기 - 내 코드, 없는 코드, 한 번 쓴 코드, 가입 기한 지남, 프로필 없음은 막는다`() {
        // 내 코드
        every { inviteCodeRepository.findByCode("P7K3MQ") } returns code
        assertFailsWith<DailyMeetException> { service.redeem(inviter, "P7K3MQ") }

        // 없는 코드
        every { inviteCodeRepository.findByCode("ZZZZZZ") } returns null
        assertFailsWith<DailyMeetException> { service.redeem(invitee, "ZZZZZZ") }

        // 가입 기한 지남
        freshInvitee(createdAgo = ReferralPolicy.REDEEM_WINDOW.plusDays(1))
        assertFailsWith<DailyMeetException> { service.redeem(invitee, "P7K3MQ") }

        // 프로필 없음
        freshInvitee()
        every { memberQueryService.findProfile(invitee) } returns null
        assertFailsWith<DailyMeetException> { service.redeem(invitee, "P7K3MQ") }

        // 이미 썼음
        freshInvitee()
        every { referralRepository.saveIfNew(any()) } returns false
        assertFailsWith<DailyMeetException> { service.redeem(invitee, "P7K3MQ") }

        verify(exactly = 0) { inkService.grantTo(any(), any(), any()) }
    }
}
