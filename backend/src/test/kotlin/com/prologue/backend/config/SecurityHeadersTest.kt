package com.prologue.backend.config

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import kotlin.test.Test

/**
 * 문이 어디까지 열려 있는지 — 설정을 읽어서는 알 수 없고, 응답이 말하게 해야 하는 것들.
 *
 * 두 가지가 조용히 무너질 수 있다.
 *  - 초대장이 iframe에 들어가는지. 기본값 DENY로 되돌아가면 모임장 콘솔의 오른쪽 폰 화면이
 *    아무 오류 없이 그냥 하얗게 뜬다(2026-08-27에 그렇게 났다). 콘솔은 흉내낸 그림이 아니라
 *    참여자가 보는 진짜 페이지를 끼워 보여주기 때문에, 이 헤더 하나에 그 화면이 걸려 있다.
 *  - 모임 목록이 손님에게 열려 있는지. 닫히면 가입 없이 둘러보기가 통째로 막힌다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHeadersTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `프레임 삽입은 같은 출처에만 허용한다`() {
        mockMvc.get("/actuator/health").andExpect {
            header { string("X-Frame-Options", "SAMEORIGIN") }
        }
    }

    @Test
    fun `모임 목록은 인증 없이 열린다`() {
        mockMvc.get("/meetups").andExpect {
            status { isOk() }
        }
    }

    @Test
    fun `소개팅 쪽은 인증 없이 열리지 않는다`() {
        mockMvc.get("/members/me").andExpect { status { is4xxClientError() } }
        mockMvc.get("/meetups/members/{id}", "00000000-0000-0000-0000-000000000000").andExpect {
            status { is4xxClientError() }
        }
    }
}
