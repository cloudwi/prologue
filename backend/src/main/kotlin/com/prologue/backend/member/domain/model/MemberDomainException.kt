package com.prologue.backend.member.domain.model

/** member 도메인 규칙 위반. 상위 계층에서 적절한 응답으로 변환한다. */
class MemberDomainException(message: String) : RuntimeException(message)
