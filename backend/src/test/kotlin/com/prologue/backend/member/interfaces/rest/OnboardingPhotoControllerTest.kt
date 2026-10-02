package com.prologue.backend.member.interfaces.rest

import com.prologue.backend.auth.application.service.AccountQueryService
import com.prologue.backend.member.application.service.MemberPhotoService
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.member.application.service.OnboardingService
import com.prologue.backend.member.application.service.PhotoUploadResult
import com.prologue.backend.member.application.service.WithdrawService
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import io.mockk.every
import io.mockk.mockk
import org.springframework.mock.web.MockMultipartFile
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class OnboardingPhotoControllerTest {
    private val photoService = mockk<MemberPhotoService>()
    private val accountService = mockk<AccountQueryService>()
    private val controller = OnboardingController(
        mockk<OnboardingService>(), mockk<MemberQueryService>(), photoService,
        mockk<WithdrawService>(), accountService,
    )
    private val id = UUID.randomUUID()
    private val authentication = UsernamePasswordAuthenticationToken(id.toString(), null)
    private val file = MockMultipartFile("file", "photo.jpg", "image/jpeg", byteArrayOf(1, 2))
    private val member = Member.reconstitute(
        accountId = id, nickname = "프롤", gender = Gender.MALE,
        birthDate = LocalDate.of(1995, 5, 14), preferredGender = Gender.FEMALE,
        region = "서울", createdAt = Instant.EPOCH, photoUrls = listOf("https://cdn/photo.jpg"),
    )

    @Test
    fun `사진 안내를 기존 프로필 응답에 추가해 내려준다`() {
        every { photoService.addPhoto(id, any()) } returns PhotoUploadResult(member, "그대로 사용할 수 있어요")
        every { accountService.findEmail(id) } returns "test@example.com"

        val response = controller.addPhoto(authentication, file)

        assertEquals(member.photoUrls, response.photoUrls)
        assertEquals(id.toString(), response.accountId)
        assertEquals("그대로 사용할 수 있어요", response.photoNotice)
    }

    @Test
    fun `삭제 응답에는 지난 업로드 안내가 남지 않는다`() {
        every { photoService.removePhoto(id, any()) } returns member
        every { accountService.findEmail(id) } returns "test@example.com"

        val response = controller.removePhoto(authentication, "https://cdn/old.jpg")

        assertEquals(member.photoUrls, response.photoUrls)
        assertNull(response.photoNotice)
    }
}
