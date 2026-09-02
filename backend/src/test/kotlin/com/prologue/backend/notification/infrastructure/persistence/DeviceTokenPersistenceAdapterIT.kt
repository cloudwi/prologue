package com.prologue.backend.notification.infrastructure.persistence

import com.prologue.backend.dailymeet.domain.model.StorePlatform
import com.prologue.backend.notification.domain.model.DeviceToken
import com.prologue.backend.support.PostgresRepositoryTest
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import

/**
 * 기기 토큰 저장소 — 정오 알림이 "누구에게 보낼지"를 여기서 고른다.
 *
 * 한 사람이 폰과 태블릿 둘을 등록하면 토큰은 둘이지만 사람은 하나다. 계정이 중복으로 나오면
 * 같은 사람에게 정오마다 알림이 두 번 간다.
 */
@Import(DeviceTokenPersistenceAdapter::class)
class DeviceTokenPersistenceAdapterIT : PostgresRepositoryTest() {

    @Autowired
    private lateinit var tokens: DeviceTokenPersistenceAdapter

    @Test
    fun `기기를 등록한 계정만 한 번씩 나온다`() {
        val me = UUID.randomUUID()
        val someoneElse = UUID.randomUUID()
        tokens.save(DeviceToken.register(me, "token-phone", StorePlatform.IOS))
        tokens.save(DeviceToken.register(me, "token-tablet", StorePlatform.ANDROID))
        tokens.save(DeviceToken.register(someoneElse, "token-other", StorePlatform.ANDROID))

        val accounts = tokens.findAllAccountIds()

        assertTrue(me in accounts)
        assertTrue(someoneElse in accounts)
        assertEquals(1, accounts.count { it == me }) // 기기가 둘이어도 사람은 하나
    }
}
