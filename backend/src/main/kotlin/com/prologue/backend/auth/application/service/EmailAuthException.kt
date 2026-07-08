package com.prologue.backend.auth.application.service

/**
 * 인증코드 검증 실패(코드 없음/불일치/만료). (→ 401)
 *
 * 보안상 세부 사유(없음 vs 틀림 vs 만료)를 구분해 노출하지 않는다.
 */
class InvalidVerificationCodeException :
    RuntimeException("인증코드가 올바르지 않거나 만료되었습니다")

/**
 * 요청이 너무 잦음: 재발송 최소 간격 위반 또는 코드 시도횟수 초과. (→ 429)
 */
class TooManyRequestsException(message: String) : RuntimeException(message)
