package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import jakarta.validation.Validation
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class SimpleMeetupRequestTest {
    private val basic = MeetupController.SimpleMeetupRequest("과자 모임", "2030-10-17T18:00:00+09:00", "서로서가", 8)

    @Test fun `네 가지 기본 정보만으로 요청 검증을 통과한다`() {
        Validation.buildDefaultValidatorFactory().use { factory ->
            assertTrue(factory.validator.validate(basic).isEmpty())
            assertEquals(0, basic.details().fee)
            assertEquals("", basic.details().kakaoLink)
            assertEquals("2030-10-17T09:00:00Z", basic.details().meetAt.toString())
        }
    }
    @Test fun `필수값과 잘못된 시각 형식은 여전히 검증한다`() {
        Validation.buildDefaultValidatorFactory().use { factory ->
            assertTrue(factory.validator.validate(basic.copy(title = "", place = "", capacity = 1)).size >= 3)
        }
        assertFailsWith<DailyMeetException> { basic.copy(meetAt = "wrong").details() }
    }
}
