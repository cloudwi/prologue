package com.prologue.backend.dailymeet.interfaces.web

import org.springframework.http.MediaType
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import kotlin.test.Test

class MeetupListControllerTest {
    @Test
    fun `이전 공개 목록 요청은 모임 HTML 없이 앱 다운로드로 이동한다`() {
        val mvc = MockMvcBuilders.standaloneSetup(MeetupListController("https://prologue.day/")).build()

        mvc.get("/m") {
            accept = MediaType.TEXT_HTML
        }.andExpect {
            status { isFound() }
            redirectedUrl("https://prologue.day/download")
            header { string("Cache-Control", "no-store") }
            content { string("") }
        }
    }
}
