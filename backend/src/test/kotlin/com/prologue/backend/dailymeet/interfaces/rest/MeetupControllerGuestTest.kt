package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.MeetupCoverService
import com.prologue.backend.dailymeet.application.service.MeetupService
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertFalse
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority

/**
 * 모임 목록은 1.3부터 로그인 없이 열린다. 이 문을 열면서 생긴 함정 하나를 지키는 테스트다.
 *
 * 스프링은 인증이 없는 요청에도 익명 토큰을 채워 넣는데 그 이름이 "anonymousUser"다.
 * `Authentication?`이 null일 거라 믿고 그대로 UUID로 읽으면, 손님이 목록을 열 때마다 500이 난다.
 * 목록이 열려 있다는 사실보다 이쪽이 더 조용히 무너지는 자리라 못을 박아둔다.
 */
class MeetupControllerGuestTest {

    private val meetupService = mockk<MeetupService>()
    private val controller = MeetupController(meetupService, mockk<MeetupCoverService>())

    @Test
    fun `인증이 아예 없으면 계정 없이 목록을 읽는다`() {
        every { meetupService.upcoming(null) } returns emptyList()

        val response = controller.upcoming(authentication = null)

        assertFalse(response.canCreate) // 손님은 모임을 열 수 없다
        verify(exactly = 1) { meetupService.upcoming(null) }
        verify(exactly = 0) { meetupService.canHost(any()) }
    }

    @Test
    fun `익명 토큰도 손님으로 읽는다 - 이름을 UUID로 파싱하지 않는다`() {
        every { meetupService.upcoming(null) } returns emptyList()
        val anonymous = AnonymousAuthenticationToken(
            "key",
            "anonymousUser",
            listOf(SimpleGrantedAuthority("ROLE_ANONYMOUS")),
        )

        val response = controller.upcoming(anonymous)

        assertFalse(response.canCreate)
        verify(exactly = 1) { meetupService.upcoming(null) }
    }

    @Test
    fun `회원이면 자기 계정으로 읽는다`() {
        val accountId = UUID.randomUUID()
        every { meetupService.upcoming(accountId) } returns emptyList()
        every { meetupService.canHost(accountId) } returns true

        val response = controller.upcoming(UsernamePasswordAuthenticationToken(accountId.toString(), null, emptyList()))

        assert(response.canCreate)
        verify(exactly = 1) { meetupService.upcoming(accountId) }
    }
}
