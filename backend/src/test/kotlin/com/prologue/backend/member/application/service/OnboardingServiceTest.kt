package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
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

class OnboardingServiceTest {

    private val memberRepository = mockk<MemberRepository>()
    private val service = OnboardingService(memberRepository)

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
}
