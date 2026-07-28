package com.prologue.backend.member.application.service

import com.prologue.backend.member.application.port.PhotoInspection
import com.prologue.backend.member.application.port.PhotoInspector
import com.prologue.backend.member.application.port.PhotoRejectedException
import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.domain.model.Gender
import com.prologue.backend.member.domain.model.Member
import com.prologue.backend.member.domain.model.MemberDomainException
import com.prologue.backend.member.domain.repository.MemberRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class MemberPhotoServiceTest {

    private val memberRepository = mockk<MemberRepository>()
    private val photoStorage = mockk<PhotoStorage>()
    private val photoInspector = mockk<PhotoInspector>()
    private val service = MemberPhotoService(memberRepository, photoStorage, photoInspector)

    private val accountId = UUID.randomUUID()
    /** 실제 JPEG 시그니처 — 서비스가 바이트로 형식을 판별하므로 아무 바이트나 쓸 수 없다. */
    private val bytes = byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte(), 0xE0.toByte())

    private fun member() = Member.reconstitute(
        accountId = accountId,
        nickname = "프롤",
        gender = Gender.MALE,
        birthDate = LocalDate.of(1995, 5, 14),
        preferredGender = Gender.FEMALE,
        region = "서울",
        createdAt = Instant.now(),
    )

    private fun givenMember() {
        every { memberRepository.findByAccountId(accountId) } returns member()
        every { memberRepository.save(any()) } answers { firstArg() }
    }

    private fun inspectionReturns(inspection: PhotoInspection) {
        every { photoInspector.inspect(bytes, "image/jpeg") } returns inspection
    }

    @Test
    fun `아이폰 HEIC는 원인을 짚어 거절한다`() {
        givenMember()
        val heic = byteArrayOf(0, 0, 0, 0x18) + "ftypheic".toByteArray(Charsets.US_ASCII)

        val e = assertFailsWith<MemberDomainException> { service.addPhoto(accountId, heic) }

        assertEquals(true, e.message?.contains("HEIC"))
        verify(exactly = 0) { photoInspector.inspect(any(), any()) }
        verify(exactly = 0) { photoStorage.uploadProfilePhoto(any(), any(), any()) }
    }

    @Test
    fun `얼굴이 담긴 사진이면 업로드해 목록에 추가한다`() {
        givenMember()
        inspectionReturns(PhotoInspection(faceCount = 1, largestFaceRatio = 0.2, unsafe = false))
        every { photoStorage.uploadProfilePhoto(accountId, bytes, "image/jpeg") } returns "https://cdn/photo.jpg"

        val result = service.addPhoto(accountId, bytes)

        assertEquals(listOf("https://cdn/photo.jpg"), result.photoUrls)
    }

    @Test
    fun `얼굴이 없으면 거절하고 저장소에 올리지 않는다`() {
        givenMember()
        inspectionReturns(PhotoInspection(faceCount = 0, largestFaceRatio = null, unsafe = false))

        val e = assertFailsWith<PhotoRejectedException> { service.addPhoto(accountId, bytes) }

        assertEquals("얼굴이 보이지 않아요. 얼굴이 나온 사진으로 올려주세요", e.message)
        verify(exactly = 0) { photoStorage.uploadProfilePhoto(any(), any(), any()) }
        verify(exactly = 0) { memberRepository.save(any()) }
    }

    @Test
    fun `얼굴이 있어도 너무 작게 나왔으면 거절한다`() {
        givenMember()
        inspectionReturns(PhotoInspection(faceCount = 1, largestFaceRatio = 0.005, unsafe = false))

        val e = assertFailsWith<PhotoRejectedException> { service.addPhoto(accountId, bytes) }

        assertEquals("얼굴이 너무 작게 나왔어요. 조금 더 가까이서 찍은 사진으로 올려주세요", e.message)
        verify(exactly = 0) { photoStorage.uploadProfilePhoto(any(), any(), any()) }
    }

    @Test
    fun `선정적인 사진은 얼굴이 있어도 거절한다`() {
        givenMember()
        inspectionReturns(PhotoInspection(faceCount = 1, largestFaceRatio = 0.3, unsafe = true))

        val e = assertFailsWith<PhotoRejectedException> { service.addPhoto(accountId, bytes) }

        assertEquals("선정적이거나 부적절한 사진은 등록할 수 없어요", e.message)
        verify(exactly = 0) { photoStorage.uploadProfilePhoto(any(), any(), any()) }
    }

    @Test
    fun `검수기를 못 쓰면 통과시킨다 - 검수 실패가 가입 실패가 되면 안 된다`() {
        givenMember()
        inspectionReturns(PhotoInspection.skipped())
        every { photoStorage.uploadProfilePhoto(accountId, bytes, "image/jpeg") } returns "https://cdn/photo.jpg"

        val result = service.addPhoto(accountId, bytes)

        assertEquals(listOf("https://cdn/photo.jpg"), result.photoUrls)
    }

}
