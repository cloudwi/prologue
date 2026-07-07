package com.prologue.backend.auth.application.service

/** 이미 가입된 이메일로 다시 가입을 시도할 때. (→ 409) */
class EmailAlreadyRegisteredException(email: String) :
    RuntimeException("이미 가입된 이메일입니다: $email")

/**
 * 로그인 실패(존재하지 않는 이메일 또는 비밀번호 불일치). (→ 401)
 *
 * 보안상 "이메일 없음"과 "비밀번호 틀림"을 구분하지 않는다 — 계정 존재 여부가 노출되지 않도록.
 */
class InvalidCredentialsException :
    RuntimeException("이메일 또는 비밀번호가 올바르지 않습니다")
