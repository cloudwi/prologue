package com.prologue.backend.member.application.service

import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberConsent
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.model.PoliticalLeaning
import com.prologue.backend.member.domain.model.Religion
import com.prologue.backend.member.domain.repository.MemberConsentRepository
import com.prologue.backend.member.domain.repository.MemberRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class BeliefsServiceTest {

    private val memberRepository = mockk<MemberRepository>()
    private val consentRepository = mockk<MemberConsentRepository>(relaxed = true)
    private val service = BeliefsService(memberRepository, consentRepository)

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

    private fun givenMember(m: Member = member()): Member {
        every { memberRepository.findByAccountId(accountId) } returns m
        every { memberRepository.save(any()) } answers { firstArg() }
        return m
    }

    @Test
    fun `동의 없이는 적을 수 없다`() {
        givenMember()
        every { consentRepository.beliefsAgreedByAccountId(accountId) } returns false

        assertFailsWith<MemberDomainException> {
            service.update(accountId, Religion.BUDDHIST, null, consented = false, legalVersion = "2026-09-02")
        }
        verify(exactly = 0) { memberRepository.save(any()) }
    }

    @Test
    fun `동의하면 적히고 동의 기록이 한 줄 쌓인다`() {
        val m = givenMember()
        every { consentRepository.beliefsAgreedByAccountId(accountId) } returns false
        val recorded = slot<MemberConsent>()
        every { consentRepository.save(capture(recorded)) } answers { recorded.captured }

        val view = service.update(accountId, Religion.NONE, PoliticalLeaning.CENTER, consented = true, legalVersion = "2026-09-02")

        assertEquals(Religion.NONE, m.religion)
        assertEquals(PoliticalLeaning.CENTER, m.politicalLeaning)
        assertTrue(view.consented)
        assertTrue(recorded.captured.beliefs)
        assertEquals("2026-09-02", recorded.captured.legalVersion)
    }

    @Test
    fun `이미 동의한 사람에게는 다시 묻지 않는다`() {
        val m = givenMember()
        every { consentRepository.beliefsAgreedByAccountId(accountId) } returns true

        service.update(accountId, Religion.CATHOLIC, null, consented = false, legalVersion = null)

        assertEquals(Religion.CATHOLIC, m.religion)
        verify(exactly = 0) { consentRepository.save(any()) }
    }

    @Test
    fun `지우는 데는 동의가 필요 없다`() {
        // 삭제·처리정지는 권리지 거래가 아니다.
        val m = givenMember()
        m.updateBeliefs(Religion.BUDDHIST, PoliticalLeaning.PROGRESSIVE)
        every { consentRepository.beliefsAgreedByAccountId(accountId) } returns false

        val view = service.update(accountId, null, null, consented = false, legalVersion = null)

        assertNull(m.religion)
        assertNull(m.politicalLeaning)
        assertNull(view.religion)
        verify(exactly = 0) { consentRepository.save(any()) }
    }

    @Test
    fun `약관 버전 없이는 동의를 기록하지 않는다`() {
        // 어느 문서에 동의했는지 모르는 기록은 기록이 아니다.
        givenMember()
        every { consentRepository.beliefsAgreedByAccountId(accountId) } returns false

        assertFailsWith<MemberDomainException> {
            service.update(accountId, Religion.CHRISTIAN, null, consented = true, legalVersion = "  ")
        }
    }

    @Test
    fun `무교는 답이고 밝히지 않음은 빈 값이다`() {
        // NONE(무교)과 null(밝히지 않음)이 같은 값이 되면 프로필이 거짓말을 한다.
        val m = givenMember()
        every { consentRepository.beliefsAgreedByAccountId(accountId) } returns true

        service.update(accountId, Religion.NONE, null, consented = false, legalVersion = null)

        assertEquals(Religion.NONE, m.religion)
        assertTrue(m.hasBeliefs())
    }
}
