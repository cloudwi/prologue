package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberConsent
import com.prologue.backend.member.domain.repository.MemberConsentRepository
import com.prologue.backend.member.domain.repository.MemberRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class OnboardingServiceTest {

    private val memberRepository = mockk<MemberRepository>()
    private val consentRepository = mockk<MemberConsentRepository>(relaxed = true)
    private val service = OnboardingService(memberRepository, consentRepository)

    private val agreement = ConsentAgreement(
        legalVersion = "2026-08-11",
        terms = true,
        privacy = true,
        age = true,
        sensitive = true,
        marketing = false,
    )

    private val accountId = UUID.randomUUID()
    private val command = CompleteOnboardingCommand(
        accountId = accountId,
        nickname = "프롤",
        gender = Gender.MALE,
        birthDate = LocalDate.of(1995, 5, 14),
        preferredGender = Gender.FEMALE,
        region = "서울",
        phone = "010-1234-5678",
    )

    @Test
    fun `최초 온보딩이면 프로필을 새로 생성한다`() {
        every { memberRepository.findByAccountId(accountId) } returns null
        val saved = slot<Member>()
        every { memberRepository.save(capture(saved)) } answers { saved.captured }

        val result = service.complete(command)

        assertEquals(accountId, result.accountId)
        assertEquals("프롤", result.nickname)
        assertEquals(Gender.FEMALE, result.preferredGender)
        assertEquals("서울", result.region)
        verify(exactly = 1) { memberRepository.save(any()) }
    }

    @Test
    fun `기존 프로필이면 수정한다`() {
        val existing = Member.reconstitute(
            accountId = accountId,
            nickname = "옛닉",
            gender = Gender.MALE,
            birthDate = LocalDate.of(1990, 1, 2),
            preferredGender = Gender.FEMALE,
            region = "부산",
            createdAt = Instant.now(),
        )
        every { memberRepository.findByAccountId(accountId) } returns existing
        every { memberRepository.save(any()) } answers { firstArg() }

        val result = service.complete(command)

        assertEquals("프롤", result.nickname) // 수정 반영
        assertEquals("서울", result.region)
        assertEquals("01012345678", result.phone) // 하이픈을 걷어내고 숫자만 저장
        assertEquals(accountId, result.accountId)
    }

    @Test
    fun `최초 가입이면 동의를 함께 남긴다`() {
        every { memberRepository.findByAccountId(accountId) } returns null
        every { memberRepository.save(any()) } answers { firstArg() }
        every { consentRepository.existsByAccountId(accountId) } returns false
        val consent = slot<MemberConsent>()
        every { consentRepository.save(capture(consent)) } answers { consent.captured }

        service.complete(command.copy(consent = agreement))

        assertEquals(accountId, consent.captured.accountId)
        assertEquals("2026-08-11", consent.captured.legalVersion)
        assertTrue(consent.captured.sensitive) // 민감정보 동의가 기록에 남아야 한다
        assertEquals(false, consent.captured.marketing)
    }

    @Test
    fun `프로필 수정에서는 동의를 다시 남기지 않는다`() {
        val existing = Member.reconstitute(
            accountId = accountId,
            nickname = "옛닉",
            gender = Gender.MALE,
            birthDate = LocalDate.of(1990, 1, 2),
            preferredGender = Gender.FEMALE,
            region = "부산",
            createdAt = Instant.now(),
        )
        every { memberRepository.findByAccountId(accountId) } returns existing
        every { memberRepository.save(any()) } answers { firstArg() }

        service.complete(command.copy(consent = agreement))

        verify(exactly = 0) { consentRepository.save(any()) }
    }

    @Test
    fun `동의를 보내지 않은 옛 앱 버전도 가입은 막지 않는다`() {
        // 이 기능 이전에 배포된 앱이 유저 폰에 남아 있다 — 여기서 막으면 그 앱들의 가입이 통째로 실패한다.
        every { memberRepository.findByAccountId(accountId) } returns null
        every { memberRepository.save(any()) } answers { firstArg() }

        val result = service.complete(command)

        assertEquals(accountId, result.accountId)
        verify(exactly = 0) { consentRepository.save(any()) }
    }
}
