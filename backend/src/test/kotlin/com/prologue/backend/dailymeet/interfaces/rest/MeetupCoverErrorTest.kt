package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.MeetupCoverService
import com.prologue.backend.dailymeet.application.service.MeetupService
import com.prologue.backend.member.application.port.PhotoRejectedException
import com.prologue.backend.member.application.port.PhotoUploadException
import com.prologue.backend.member.application.port.StorageNotConfiguredException
import io.mockk.every
import io.mockk.mockk
import org.springframework.mock.web.MockMultipartFile
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.multipart.MaxUploadSizeExceededException
import java.util.UUID
import kotlin.test.Test

class MeetupCoverErrorTest {
    private val cover = mockk<MeetupCoverService>()
    private val mvc = MockMvcBuilders.standaloneSetup(MeetupController(mockk<MeetupService>(), cover))
        .setControllerAdvice(DailyMeetExceptionHandler()).build()

    private fun check(error: Exception, expectedStatus: Int, code: String, message: String) {
        every { cover.upload(any(), any()) } throws error
        mvc.perform(multipart("/meetups/cover")
            .file(MockMultipartFile("file", "cover.jpg", "image/jpeg", byteArrayOf(1)))
            .principal(UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null)))
            .andExpect(status().`is`(expectedStatus))
            .andExpect(jsonPath("$.code").value(code))
            .andExpect(jsonPath("$.message").value(message))
    }

    @Test fun `부적절 사진은 일반 서버 오류 대신 거절 이유를 돌려준다`() =
        check(PhotoRejectedException("부적절한 사진은 커버로 쓸 수 없어요"), 422, "PHOTO_REJECTED", "부적절한 사진은 커버로 쓸 수 없어요")

    @Test fun `저장소 미설정은 재시도 안내와 503으로 돌려준다`() =
        check(StorageNotConfiguredException(), 503, "STORAGE_NOT_CONFIGURED", "지금은 사진을 저장할 수 없어요. 잠시 후 다시 시도해주세요.")

    @Test fun `저장소 장애는 내부 원인을 노출하지 않고 안내한다`() =
        check(PhotoUploadException("internal storage detail"), 502, "PHOTO_UPLOAD_FAILED", "사진을 저장하지 못했어요. 잠시 후 다시 시도해주세요.")

    @Test fun `용량 초과는 작은 사진을 고르도록 안내한다`() =
        check(MaxUploadSizeExceededException(12_000_000), 413, "PHOTO_TOO_LARGE", "사진 용량이 너무 커요. 조금 더 작은 사진으로 올려주세요.")
}
