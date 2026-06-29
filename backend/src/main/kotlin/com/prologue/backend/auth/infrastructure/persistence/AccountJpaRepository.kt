package com.prologue.backend.auth.infrastructure.persistence

import com.prologue.backend.auth.domain.model.SocialProvider
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

/**
 * Spring Data JPA 리포지토리. 구현은 Spring이 런타임에 생성한다.
 */
interface AccountJpaRepository : JpaRepository<AccountJpaEntity, UUID> {

    @Query(
        "select a from AccountJpaEntity a join a.connections c " +
            "where c.provider = :provider and c.providerUserId = :providerUserId",
    )
    fun findBySocialConnection(
        @Param("provider") provider: SocialProvider,
        @Param("providerUserId") providerUserId: String,
    ): AccountJpaEntity?
}
