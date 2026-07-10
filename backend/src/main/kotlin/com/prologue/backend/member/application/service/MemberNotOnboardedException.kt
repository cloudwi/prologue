package com.prologue.backend.member.application.service

/** 프로필(온보딩) 없이 사진 업로드 등 후속 작업을 시도할 때. (→ 409) */
class MemberNotOnboardedException : RuntimeException("먼저 프로필을 등록해 주세요")
