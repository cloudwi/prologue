package com.prologue.backend.growth

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import kotlin.test.Test

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GrowthSecurityTest {
    @Autowired lateinit var mvc: MockMvc
    @Test fun `anonymous cannot read growth`() { mvc.get("/admin/growth").andExpect { status { is4xxClientError() } } }
    @Test @WithMockUser(roles=["USER"])
    fun `members cannot read growth`() { mvc.get("/admin/growth").andExpect { status { isForbidden() } } }
    @Test @WithMockUser(roles=["ADMIN"])
    fun `admin cannot request an unbounded range`() { mvc.get("/admin/growth?days=3650").andExpect { status { isBadRequest() } } }
}
