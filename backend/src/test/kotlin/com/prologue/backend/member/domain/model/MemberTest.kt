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

    private fun memberWithPhotos(vararg urls: String): Member =
        Member.reconstitute(
            accountId = UUID.randomUUID(),
            nickname = "닉",
            gender = Gender.MALE,
            birthDate = LocalDate.of(1995, 5, 14),
            preferredGender = Gender.FEMALE,
            region = "서울특별시 강남구",
            createdAt = now,
            photoUrls = urls.toList(),
        )

    @Test
    fun `사진이 최소 장수를 넘으면 지울 수 있다`() {
        val member = memberWithPhotos("a", "b", "c")
        member.removePhoto("c")
        kotlin.test.assertEquals(listOf("a", "b"), member.photoUrls)
    }

    @Test
    fun `사진 최소 장수에서는 지울 수 없다 - 교체는 추가 후 삭제 순서`() {
        val member = memberWithPhotos("a", "b")
        assertFailsWith<MemberDomainException> { member.removePhoto("a") }
    }

    @Test
    fun `최소 장수를 못 채운 계정은 자유롭게 지운다 - 바닥은 채운 뒤에만 생긴다`() {
        val member = memberWithPhotos("a")
        member.removePhoto("a")
        kotlin.test.assertEquals(emptyList(), member.photoUrls)
    }

    @Test
    fun `목록에 없는 사진 삭제는 무시한다 - 최소 장수여도 예외가 아니다`() {
        val member = memberWithPhotos("a", "b")
        member.removePhoto("없는사진")
        kotlin.test.assertEquals(listOf("a", "b"), member.photoUrls)
    }

    @Test
    fun `검수 삭제는 최소 장수 밑으로도 내린다`() {
        val member = memberWithPhotos("a", "b")
        member.stripPhoto("a")
        kotlin.test.assertEquals(listOf("b"), member.photoUrls)
    }
}
