package com.prologue.backend.auth.infrastructure.persistence

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/**
 * Spring Data JPA 리포지토리. 구현은 Spring이 런타임에 생성한다.
 */
interface AccountJpaRepository : JpaRepository<AccountJpaEntity, UUID> {

    /** 이메일(정규화된 형태)로 계정 조회. */
    fun findByEmail(email: String): AccountJpaEntity?
}
