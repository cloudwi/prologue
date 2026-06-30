package com.prologue.backend.member.domain.repository

import com.prologue.backend.member.domain.model.Member
import java.util.UUID

/** Member 애그리거트 영속성 포트. 인프라(JPA)가 구현. */
interface MemberRepository {
    fun findByAccountId(accountId: UUID): Member?
    fun save(member: Member): Member
}
