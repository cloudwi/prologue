package com.prologue.backend

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/**
 * 애플리케이션이 뜨는지만 본다 — 빈 배선이 맞는지 확인하는 그물.
 *
 * 오래 실패해 있던 테스트라 사실상 없는 것과 같았고, 그 틈으로 기동 불가 오류가 배포까지 갔다.
 * (PurchaseVerifier 빈 누락) 이 테스트는 초록이어야 의미가 있다.
 */
@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

    @Test
    fun contextLoads() {
    }
}
