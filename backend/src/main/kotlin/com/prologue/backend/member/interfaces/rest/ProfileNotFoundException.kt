package com.prologue.backend.member.interfaces.rest

/** 아직 온보딩(프로필 작성)을 완료하지 않은 경우. (→ 404) */
class ProfileNotFoundException : RuntimeException("프로필이 아직 없습니다")
