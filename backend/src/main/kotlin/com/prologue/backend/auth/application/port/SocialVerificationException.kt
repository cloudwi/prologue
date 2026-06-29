package com.prologue.backend.auth.application.port

/**
 * 소셜 토큰 검증 실패(유효하지 않은 토큰, 미지원 제공자, 제공자 API 오류 등).
 * 상위 계층에서 401 등 적절한 응답으로 변환한다.
 */
class SocialVerificationException(message: String, cause: Throwable? = null) :
    RuntimeException(message, cause)
