package com.prologue.backend.dailymeet.infrastructure.persistence

import com.prologue.backend.member.application.service.JobVerificationService
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.infrastructure.persistence.MemberPersistenceAdapter
import com.prologue.backend.support.PostgresRepositoryTest
import io.mockk.mockk
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@Import(MemberPersistenceAdapter::class, MemberQueryService::class)
class HostApplicantProfilesBatchIT : PostgresRepositoryTest() {
    @Autowired private lateinit var members: MemberPersistenceAdapter
    @Autowired private lateinit var profiles: MemberQueryService
    @Autowired private lateinit var jdbc: JdbcTemplate

    @Test fun `요청한 신청자 프로필과 인증 여부만 묶어 읽는다`() {
        val first = UUID.randomUUID()
        val second = UUID.randomUUID()
        val other = UUID.randomUUID()
        for (id in listOf(first, second, other)) members.save(Member.reconstitute(
            accountId = id, nickname = "참가자", gender = Gender.MALE, birthDate = LocalDate.of(1995, 1, 1),
            preferredGender = null, region = "서울", createdAt = Instant.EPOCH,
        ))
        for (id in listOf(first, other)) jdbc.update("insert into job_verifications (account_id, email_domain) values (?, ?)", id, "example.com")
        val jobs = JobVerificationService(mockk(), mockk(), mockk(), mockk(), jdbc, mockk())
        assertEquals(setOf(first, second), profiles.findProfiles(listOf(first, second)).keys)
        assertEquals(setOf(first), jobs.verifiedAccounts(listOf(first, second)))
        assertTrue(profiles.findProfiles(emptyList()).isEmpty())
        assertTrue(jobs.verifiedAccounts(emptyList()).isEmpty())
    }
}
