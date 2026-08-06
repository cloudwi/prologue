package com.prologue.backend.member.domain.model

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertFailsWith

class MemberTest {

    private val kst = ZoneId.of("Asia/Seoul")
    private val now = Instant.parse("2026-08-06T03:00:00Z") // KST 2026-08-06 정오

    private fun register(birthDate: LocalDate): Member =
        Member.register(
            accountId = UUID.randomUUID(),
            nickname = "닉",
            gender = Gender.MALE,
            birthDate = birthDate,
            preferredGender = Gender.FEMALE,
            region = "서울특별시 강남구",
            phone = "010-1234-5678",
            now = now,
        )

    @Test
    fun `만 19세는 가입할 수 있다`() {
        val today = now.atZone(kst).toLocalDate()
        register(today.minusYears(19)) // 오늘이 19번째 생일
    }

    @Test
    fun `만 19세 미만은 가입할 수 없다`() {
        val today = now.atZone(kst).toLocalDate()
        assertFailsWith<MemberDomainException> {
            register(today.minusYears(19).plusDays(1)) // 생일 하루 전 — 아직 만 18세
        }
    }
}
