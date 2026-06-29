package com.prologue.backend.auth.infrastructure.persistence

import com.prologue.backend.auth.domain.model.SocialProvider
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated

/**
 * account_social_connections 테이블에 매핑되는 임베디드 타입.
 * 도메인 VO [com.prologue.backend.auth.domain.model.SocialConnection]의 영속 표현.
 */
@Embeddable
class SocialConnectionEmbeddable(
    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    val provider: SocialProvider,

    @Column(name = "provider_user_id", nullable = false)
    val providerUserId: String,
) {
    // @ElementCollection Set 의미를 위해 값 동등성 정의
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is SocialConnectionEmbeddable) return false
        return provider == other.provider && providerUserId == other.providerUserId
    }

    override fun hashCode(): Int = 31 * provider.hashCode() + providerUserId.hashCode()
}
