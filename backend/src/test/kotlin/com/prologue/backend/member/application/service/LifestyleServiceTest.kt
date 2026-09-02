package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Drinking
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.MeetFrequency
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.model.Smoking
import com.prologue.backend.member.domain.repository.MemberRepository
import io.mockk.every
import io.mockk.mockk
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class LifestyleServiceTest {

    private val memberRepository = mockk<MemberRepository>()
    private val service = LifestyleService(memberRepository)
    private val accountId = UUID.randomUUID()

    private fun member() = Member.register(
        accountId = accountId,
        nickname = "테스터",
        gender = Gender.FEMALE,
        birthDate = LocalDate.of(1996, 5, 14),
        preferredGender = Gender.MALE,
        region = "서울 성동구",
        phone = "01012345678",
    )

    @Test
    fun `고른 값이 그대로 저장된다`() {
        val m = member()
        every { memberRepository.findByAccountId(accountId) } returns m
        every { memberRepository.save(any()) } answers { firstArg() }

        service.update(accountId, Smoking.NONE, Drinking.SOMETIMES, MeetFrequency.TWO_TO_THREE)

        assertEquals(Smoking.NONE, m.smoking)
        assertEquals(Drinking.SOMETIMES, m.drinking)
        assertEquals(MeetFrequency.TWO_TO_THREE, m.meetFrequency)
    }

    @Test
    fun `하나만 고르고 나머지는 비워둘 수 있다`() {
        // 셋 다 선택이다 — 하나만 답했다고 나머지를 강요하지 않는다.
        val m = member()
        every { memberRepository.findByAccountId(accountId) } returns m
        every { memberRepository.save(any()) } answers { firstArg() }

        val view = service.update(accountId, Smoking.NONE, null, null)

        assertEquals(Smoking.NONE, view.smoking)
        assertNull(view.drinking)
        assertNull(view.meetFrequency)
    }

    @Test
    fun `프로필 저장은 생활 습관을 지우지 않는다`() {
        // 프로필 저장은 전체 덮어쓰기라, updateProfile이 이 값을 건드리면 옛 화면의 저장 한 번에 날아간다.
        val m = member()
        m.updateLifestyle(Smoking.QUITTING, Drinking.RARELY, MeetFrequency.ONCE)

        m.updateProfile(
            nickname = "바뀐이름",
            gender = Gender.FEMALE,
            birthDate = LocalDate.of(1996, 5, 14),
            preferredGender = Gender.MALE,
            region = "서울 마포구",
            phone = "01012345678",
        )

        assertEquals(Smoking.QUITTING, m.smoking)
        assertEquals(Drinking.RARELY, m.drinking)
        assertEquals(MeetFrequency.ONCE, m.meetFrequency)
    }

    @Test
    fun `프로필이 없으면 저장할 수 없다`() {
        every { memberRepository.findByAccountId(accountId) } returns null

        assertFailsWith<MemberDomainException> { service.update(accountId, Smoking.NONE, null, null) }
    }
}
