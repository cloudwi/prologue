package com.prologue.backend.auth.infrastructure.oauth

import com.prologue.backend.auth.application.port.SocialUserInfo
import com.prologue.backend.auth.application.port.SocialVerificationException
import com.prologue.backend.auth.application.port.SocialVerifier
import com.prologue.backend.auth.domain.model.SocialProvider
import org.springframework.stereotype.Component

/**
 * [SocialVerifier] 포트 구현. 등록된 [SocialClient]들을 제공자별로 묶어 디스패치한다.
 * 새 제공자(네이버/구글/애플)는 SocialClient 구현체만 추가하면 자동 연결된다.
 */
@Component
class SocialVerifierDispatcher(clients: List<SocialClient>) : SocialVerifier {

    private val byProvider: Map<SocialProvider, SocialClient> = clients.associateBy { it.provider }

    override fun verify(provider: SocialProvider, rawToken: String): SocialUserInfo {
        val client = byProvider[provider]
            ?: throw SocialVerificationException("지원하지 않는 소셜 제공자: $provider")
        return client.fetchUser(rawToken)
    }
}
