package com.prologue.backend.member.infrastructure.persistence

import com.prologue.backend.member.domain.model.Drinking
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.MeetFrequency
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberConsent
import com.prologue.backend.member.domain.model.PoliticalLeaning
import com.prologue.backend.member.domain.model.Religion
import com.prologue.backend.member.domain.model.Smoking
import com.prologue.backend.support.PostgresRepositoryTest
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

/**
 * 종교·정치 성향과 그 동의 기록 — 진짜 Postgres에 실제로 쿼리를 던진다.
 *
 * V60이 members에 두 열을, member_consents에 한 열을 더한다. 마이그레이션과 엔티티가 어긋나면
 * `ddl-auto: validate`가 여기서 걸리고, 프로필 저장이 이 값을 지우지 않는지도 여기서만 확인된다.
 */
@Import(MemberPersistenceAdapter::class, MemberConsentPersistenceAdapter::class)
class MemberBeliefsPersistenceAdapterIT : PostgresRepositoryTest() {

    @Autowired
    private lateinit var members: MemberPersistenceAdapter

    @Autowired
    private lateinit var consents: MemberConsentPersistenceAdapter

    private fun newMember(accountId: UUID = UUID.randomUUID()) = Member.register(
        accountId = accountId,
        nickname = "테스터",
        gender = Gender.FEMALE,
        birthDate = LocalDate.of(1996, 5, 14),
        preferredGender = Gender.MALE,
        region = "서울 성동구",
        phone = "01012345678",
    )

    @Test
    fun `적은 종교와 성향이 그대로 돌아온다`() {
        val member = newMember().apply { updateBeliefs(Religion.BUDDHIST, PoliticalLeaning.CENTER_LEFT) }
        members.save(member)

        val loaded = members.findByAccountId(member.accountId)!!

        assertEquals(Religion.BUDDHIST, loaded.religion)
        assertEquals(PoliticalLeaning.CENTER_LEFT, loaded.politicalLeaning)
    }

    @Test
    fun `안 적으면 비어 있다 - 무응답도 저장하지 않는다`() {
        val member = members.save(newMember())

        assertNull(members.findByAccountId(member.accountId)!!.religion)
        assertFalse(members.findByAccountId(member.accountId)!!.hasBeliefs())
    }

    @Test
    fun `프로필을 통째로 저장해도 지워지지 않는다`() {
        // 프로필 저장은 전체 덮어쓰기다. updateProfile이 이 값을 건드리지 않아야
        // 항목을 모르는 옛 앱의 저장 한 번에 동의까지 받고 적은 값이 날아가지 않는다.
        val member = newMember().apply { updateBeliefs(Religion.CATHOLIC, PoliticalLeaning.CONSERVATIVE) }
        members.save(member)

        val loaded = members.findByAccountId(member.accountId)!!
        loaded.updateProfile(
            nickname = "바뀐이름",
            gender = Gender.FEMALE,
            birthDate = LocalDate.of(1996, 5, 14),
            preferredGender = Gender.MALE,
            region = "서울 마포구",
            phone = "01012345678",
        )
        members.save(loaded)

        val after = members.findByAccountId(member.accountId)!!
        assertEquals(Religion.CATHOLIC, after.religion)
        assertEquals(PoliticalLeaning.CONSERVATIVE, after.politicalLeaning)
    }

    @Test
    fun `생활 습관도 저장되고 프로필 저장에 지워지지 않는다`() {
        // V62의 세 열이 엔티티와 맞는지(ddl-auto validate), 그리고 전체 덮어쓰기에 살아남는지.
        val member = newMember().apply {
            updateLifestyle(Smoking.NONE, Drinking.SOMETIMES, MeetFrequency.TWO_TO_THREE)
        }
        members.save(member)

        val loaded = members.findByAccountId(member.accountId)!!
        loaded.updateProfile(
            nickname = "바뀐이름",
            gender = Gender.FEMALE,
            birthDate = LocalDate.of(1996, 5, 14),
            preferredGender = Gender.MALE,
            region = "서울 마포구",
            phone = "01012345678",
        )
        members.save(loaded)

        val after = members.findByAccountId(member.accountId)!!
        assertEquals(Smoking.NONE, after.smoking)
        assertEquals(Drinking.SOMETIMES, after.drinking)
        assertEquals(MeetFrequency.TWO_TO_THREE, after.meetFrequency)
    }

    @Test
    fun `신념 동의 기록은 항목별로 조회된다`() {
        val accountId = UUID.randomUUID()
        assertFalse(consents.beliefsAgreedByAccountId(accountId))

        consents.save(MemberConsent.recordBeliefs(accountId, "2026-09-02"))

        assertTrue(consents.beliefsAgreedByAccountId(accountId))
        // 신념 동의 줄이 선호 성별 동의를 대신하지 않는다 — 항목이 다르면 동의도 다르다.
        assertFalse(consents.sensitiveAgreedByAccountId(accountId))
    }
}
