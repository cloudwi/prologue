package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.repository.MatchRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 내 매칭 목록 조회. 매칭이 성사된 상대의 프로필을 공개한다(블라인드 해제).
 * dailymeet(Match) + member(프로필)를 조합하는 조회 유스케이스.
 */
@Service
class MatchQueryService(
    private val matchRepository: MatchRepository,
    private val memberQueryService: MemberQueryService,
) {
    @Transactional(readOnly = true)
    fun myMatches(accountId: UUID): List<MatchView> =
        matchRepository.findByAccount(accountId).mapNotNull { match ->
            val peerId = if (match.accountLow == accountId) match.accountHigh else match.accountLow
            val profile = memberQueryService.findProfile(peerId) ?: return@mapNotNull null
            MatchView(
                peerAccountId = peerId,
                nickname = profile.nickname,
                gender = profile.gender,
                birthYear = profile.birthYear,
                region = profile.region,
                matchedAt = match.createdAt,
            )
        }
}
