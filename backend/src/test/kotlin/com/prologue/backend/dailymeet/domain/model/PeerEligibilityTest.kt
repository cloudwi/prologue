package com.prologue.backend.dailymeet.domain.model

import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PeerEligibilityTest {

    private fun member(
        gender: Gender,
        prefers: Gender?,
        photos: List<String> = listOf("a.jpg", "b.jpg"),
        id: UUID = UUID.randomUUID(),
        birthDate: LocalDate = LocalDate.of(1995, 5, 14),
        minAge: Int? = null,
        maxAge: Int? = null,
    ): Member = Member.reconstitute(
        id, "닉", gender, birthDate, prefers, "서울 성동구", Instant.now(),
        photoUrls = photos, minAge = minAge, maxAge = maxAge,
    )

    /** 오늘을 고정한다 — 생일이 지났는지에 따라 테스트가 하루 만에 뒤집히지 않게. */
    private val today = LocalDate.of(2026, 1, 1)

    /** [age]세가 되는 생년월일. */
    private fun bornToBe(age: Int): LocalDate = today.minusYears(age.toLong())

    private val me = member(Gender.MALE, Gender.FEMALE)

    @Test
    fun `서로의 성별을 원하고 사진이 있고 처음 만나면 후보다`() {
        val peer = member(Gender.FEMALE, Gender.MALE)

        assertTrue(PeerEligibility.isEligible(me, peer, alreadyMet = emptySet()))
    }

    @Test
    fun `내가 원하지 않는 성별은 후보가 아니다`() {
        val peer = member(Gender.MALE, Gender.FEMALE)

        assertFalse(PeerEligibility.isEligible(me, peer, alreadyMet = emptySet()))
    }

    @Test
    fun `상대가 나를 원하지 않으면 후보가 아니다`() {
        // 한쪽만 원하는 건 소개가 아니라 강요다
        val peer = member(Gender.FEMALE, Gender.FEMALE)

        assertFalse(PeerEligibility.isEligible(me, peer, alreadyMet = emptySet()))
    }

    @Test
    fun `선호 성별을 비워둔 사람은 소개받지 않는다 - 모임만 하러 온 사람이다`() {
        val onlyMeetups = member(Gender.MALE, prefers = null)
        val peer = member(Gender.FEMALE, Gender.MALE)

        assertFalse(PeerEligibility.isEligible(onlyMeetups, peer, alreadyMet = emptySet()))
    }

    @Test
    fun `선호 성별을 비워둔 사람은 남에게 소개되지도 않는다`() {
        val peer = member(Gender.FEMALE, prefers = null)

        assertFalse(PeerEligibility.isEligible(me, peer, alreadyMet = emptySet()))
    }

    @Test
    fun `내가 정한 나이대 밖이면 후보가 아니다`() {
        val me = member(Gender.MALE, Gender.FEMALE, birthDate = bornToBe(30), minAge = 28, maxAge = 34)
        val tooYoung = member(Gender.FEMALE, Gender.MALE, birthDate = bornToBe(25))

        assertFalse(PeerEligibility.isEligible(me, tooYoung, alreadyMet = emptySet(), today = today))
    }

    @Test
    fun `내 나이대 안이면 후보다 - 경계도 포함한다`() {
        val me = member(Gender.MALE, Gender.FEMALE, birthDate = bornToBe(30), minAge = 28, maxAge = 34)
        val atEdge = member(Gender.FEMALE, Gender.MALE, birthDate = bornToBe(34))

        assertTrue(PeerEligibility.isEligible(me, atEdge, alreadyMet = emptySet(), today = today))
    }

    @Test
    fun `상대가 정한 나이대 밖이면 후보가 아니다 - 한쪽만 원하는 건 소개가 아니다`() {
        // 내 범위에는 상대가 들어오지만, 상대의 범위에는 내가 없다.
        val me = member(Gender.MALE, Gender.FEMALE, birthDate = bornToBe(41))
        val peer = member(Gender.FEMALE, Gender.MALE, birthDate = bornToBe(29), minAge = 27, maxAge = 35)

        assertFalse(PeerEligibility.isEligible(me, peer, alreadyMet = emptySet(), today = today))
    }

    @Test
    fun `한쪽만 정해도 그쪽만 조인다`() {
        val me = member(Gender.MALE, Gender.FEMALE, birthDate = bornToBe(30), minAge = 28)
        val older = member(Gender.FEMALE, Gender.MALE, birthDate = bornToBe(52))

        // 상한을 두지 않았으니 나이로는 걸리지 않는다
        assertTrue(PeerEligibility.isEligible(me, older, alreadyMet = emptySet(), today = today))
    }

    @Test
    fun `아무도 나이대를 정하지 않으면 나이로 거르지 않는다`() {
        val me = member(Gender.MALE, Gender.FEMALE, birthDate = bornToBe(25))
        val peer = member(Gender.FEMALE, Gender.MALE, birthDate = bornToBe(48))

        assertTrue(PeerEligibility.isEligible(me, peer, alreadyMet = emptySet(), today = today))
    }

    @Test
    fun `사진이 모자라면 후보가 아니다`() {
        val peer = member(Gender.FEMALE, Gender.MALE, photos = listOf("only-one.jpg"))

        assertFalse(PeerEligibility.isEligible(me, peer, alreadyMet = emptySet()))
    }

    @Test
    fun `한 번 소개된 사람은 다시 후보가 되지 않는다`() {
        val peer = member(Gender.FEMALE, Gender.MALE)

        assertFalse(PeerEligibility.isEligible(me, peer, alreadyMet = setOf(peer.accountId)))
    }
}
