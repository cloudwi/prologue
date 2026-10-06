package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.member.application.port.PhotoInspection
import com.prologue.backend.member.application.port.PhotoInspector
import com.prologue.backend.member.application.port.PhotoRejectedException
import com.prologue.backend.member.application.port.PhotoStorage
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class MeetupCoverServiceTest {
    private val storage = mockk<PhotoStorage>()
    private val inspector = mockk<PhotoInspector>()
    private val service = MeetupCoverService(storage, inspector)
    private val id = UUID.randomUUID()
    private val jpeg = byteArrayOf(0xff.toByte(), 0xd8.toByte(), 0xff.toByte(), 0xe0.toByte())

    @Test fun `음식이나 장소 사진에는 얼굴을 요구하지 않는다`() {
        every { inspector.inspect(any(), any()) } returns PhotoInspection(0, null, false)
        every { storage.uploadProfilePhoto(id, any(), "image/jpeg") } returns "https://cdn/snack.jpg"
        assertEquals("https://cdn/snack.jpg", service.upload(id, jpeg))
    }
    @Test fun `검수 불가 표시가 함께 있어도 부적절하다고 판단한 사진은 저장하지 않는다`() {
        every { inspector.inspect(any(), any()) } returns PhotoInspection(0, null, true, skipped = true)
        assertFailsWith<PhotoRejectedException> { service.upload(id, jpeg) }
        verify(exactly = 0) { storage.uploadProfilePhoto(any(), any(), any()) }
    }
}
