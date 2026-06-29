package com.prologue.backend.auth.domain.model

/**
 * auth 도메인 규칙 위반을 나타내는 예외.
 * 인프라/HTTP 관심사와 분리된 순수 도메인 예외이며, 상위 계층에서 적절한 응답으로 변환한다.
 */
class AuthDomainException(message: String) : RuntimeException(message)
