package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.auth.domain.model.Account
import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.repository.AccountRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * 누가 모임을 열 수 있는가.
 *
 * 모임은 아직 초창기 기능이라 **운영자만 연다**(유저 결정 2026-08-25).
 * 회원은 열린 모임을 보고 신청할 수 있고, 여는 쪽만 잠근다 — 오프라인 모임은
 * 사고가 나면 앱 밖에서 나고, 처음 몇 번은 운영자가 직접 치러 보며 규칙을 배우는 편이 낫다.
 *
 * 허용목록은 이메일이다. 계정 id는 환경마다 다르고 눈으로 확인할 수 없어서,
 * 운영자가 대시보드에서 직접 고쳐 넣을 수 있는 값이라야 한다.
 *
 * **비워 두면 제한이 풀린다** — 기능을 전체 공개할 때 `MEETUP_HOST_EMAILS=`(빈 값)만 주면
 * 배포 없이 열린다. 반대로 코드 기본값이 비어 있으면 잠그는 걸 잊기 쉬워, 기본값은 잠금 쪽에 둔다.
 */
@Component
class MeetupHostPolicy(
    private val accountRepository: AccountRepository,
    @param:Value("\${meetup.host-emails:cloudwi@naver.com}") private val hostEmails: String = "",
) {
    /** 허용된 이메일 집합. 정규화(소문자·trim)해서 담는다 — 계정의 email도 같은 형태로 저장된다. */
    private val allowed: Set<String> =
        hostEmails.split(',')
            .map { Account.normalizeEmail(it) }
            .filter { it.isNotBlank() }
            .toSet()

    /** 제한이 걸려 있는지. 허용목록이 비면 누구나 열 수 있다. */
    val restricted: Boolean get() = allowed.isNotEmpty()

    fun canHost(accountId: UUID): Boolean {
        if (allowed.isEmpty()) return true
        val email = accountRepository.findById(AccountId(accountId))?.email ?: return false
        return Account.normalizeEmail(email) in allowed
    }
}
