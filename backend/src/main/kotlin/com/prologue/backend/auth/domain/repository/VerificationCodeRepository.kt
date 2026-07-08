package com.prologue.backend.auth.domain.repository

import com.prologue.backend.auth.domain.model.VerificationCode
import java.time.Instant

/**
 * VerificationCode 엔티티의 영속성 포트(아웃바운드).
 */
interface VerificationCodeRepository {

    fun save(code: VerificationCode): VerificationCode

    /** 해당 이메일의 가장 최근 미소비 코드. 검증·재발급 판단의 기준. email은 정규화된 형태. */
    fun findLatestActiveByEmail(email: String): VerificationCode?

    /** 해당 이메일의 모든 코드 삭제(재발급 시 이전 코드 무효화, 검증 성공 후 정리). */
    fun deleteByEmail(email: String)

    /** 만료된 코드 일괄 삭제(주기적 스윕). 반환값은 삭제된 행 수. */
    fun deleteExpiredBefore(now: Instant): Int
}
