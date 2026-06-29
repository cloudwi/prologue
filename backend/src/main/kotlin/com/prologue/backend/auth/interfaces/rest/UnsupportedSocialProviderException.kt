package com.prologue.backend.auth.interfaces.rest

/** 경로의 provider 값이 지원하지 않는 소셜 제공자일 때. (→ 400) */
class UnsupportedSocialProviderException(val provider: String) :
    RuntimeException("지원하지 않는 소셜 제공자: $provider")
