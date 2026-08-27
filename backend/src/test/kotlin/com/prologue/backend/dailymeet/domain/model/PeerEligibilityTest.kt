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
    ): Member = Member.reconstitute(
        id, "닉", gender, LocalDate.of(1995, 5, 14), prefers, "서울 성동구", Instant.now(),
        photoUrls = photos,
    )

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
