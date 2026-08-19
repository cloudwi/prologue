package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.auth.domain.model.AccountId
import com.prologue.backend.auth.domain.repository.AccountRepository
import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.InkPrice
import com.prologue.backend.dailymeet.domain.model.InviteCode
import com.prologue.backend.dailymeet.domain.model.Referral
import com.prologue.backend.dailymeet.domain.model.ReferralPolicy
import com.prologue.backend.dailymeet.domain.repository.InviteCodeRepository
import com.prologue.backend.dailymeet.domain.repository.ReferralRepository
import com.prologue.backend.member.application.service.MemberQueryService
import com.prologue.backend.notification.application.service.NotificationService
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 친구 초대 — 내 코드를 건네고, 친구가 그 코드를 쓰면 둘 다 잉크를 받는다.
 *
 * 초대받은 쪽은 가입 후 [ReferralPolicy.REDEEM_WINDOW] 안에, 프로필을 만든 뒤, 한 번만 쓸 수 있다.
 * 초대한 쪽은 [ReferralPolicy.MAX_REWARDED_INVITES]명까지만 보상받는다 — 가입을 찍어내 잉크를
 * 캐는 길을 좁히되, 진짜 친구를 데려오는 일은 막지 않는다.
 */
@Service
class ReferralService(
    private val inviteCodeRepository: InviteCodeRepository,
    private val referralRepository: ReferralRepository,
    private val accountRepository: AccountRepository,
    private val memberQueryService: MemberQueryService,
    private val inkService: InkService,
    private val notificationService: NotificationService,
    @param:Value("\${web.base-url}") private val webBaseUrl: String,
) {
    /** 내 초대 현황 — 코드는 처음 물을 때 만든다. */
    @Transactional
    fun mine(accountId: UUID): ReferralView {
        val code = inviteCodeRepository.findByAccountId(accountId) ?: issueCode(accountId)
        return ReferralView(
            code = code.code,
            invitedCount = referralRepository.countByInviterAndCode(accountId, code.code).toInt(),
            rewardInk = InkPrice.REFERRAL,
            maxRewardedInvites = ReferralPolicy.MAX_REWARDED_INVITES,
            shareUrl = "$webBaseUrl/download?ref=${code.code}",
            redeemed = referralRepository.existsByInvitee(accountId),
        )
    }

    /**
     * 초대 코드 쓰기 — 초대받은 사람이 부른다. 성공하면 둘 다 잉크를 받는다.
     * @return 나(초대받은 쪽)에게 지급된 잉크
     */
    @Transactional
    fun redeem(accountId: UUID, rawCode: String, now: Instant = Instant.now()): Int {
        val code = InviteCode.normalize(rawCode)
        if (code.length !in InviteCode.MIN_LENGTH..InviteCode.MAX_LENGTH) throw DailyMeetException("초대 코드를 다시 확인해 주세요")
        val invite = inviteCodeRepository.findByCode(code) ?: throw DailyMeetException("없는 초대 코드예요. 다시 확인해 주세요")
        if (invite.accountId == accountId) throw DailyMeetException("내 초대 코드는 내가 쓸 수 없어요")

        val account = accountRepository.findById(AccountId(accountId)) ?: throw DailyMeetException("계정을 찾을 수 없어요")
        if (!ReferralPolicy.canRedeem(account.createdAt, now)) {
            throw DailyMeetException("초대 코드는 가입 후 ${ReferralPolicy.REDEEM_WINDOW.toDays()}일 안에만 쓸 수 있어요")
        }
        if (memberQueryService.findProfile(accountId) == null) throw DailyMeetException("프로필을 먼저 완성해 주세요")
        // 특별 코드는 정원이 있다 — 뿌린 코드가 어디까지 퍼질지 운영자가 정한다
        invite.maxUses?.let { max ->
            if (referralRepository.countByCode(code) >= max) throw DailyMeetException("이 초대 코드는 마감됐어요")
        }
        if (!referralRepository.saveIfNew(Referral.create(invite.accountId, accountId, code, now))) {
            throw DailyMeetException("초대 코드는 한 번만 쓸 수 있어요")
        }

        val inviteeReward = invite.inviteeRewardOrDefault()
        inkService.grantTo(accountId, inviteeReward, InkService.REASON_REFERRAL)

        val inviterReward = invite.inviterRewardOrDefault()
        if (inviterReward > 0 && inviterRewarded(invite)) {
            inkService.grantTo(invite.accountId, inviterReward, InkService.REASON_REFERRAL)
            notificationService.referralRewarded(invite.accountId, inviterReward)
        }
        return inviteeReward
    }

    /** 개인 코드는 상한을 탄다. 방금 저장한 한 건이 포함돼 있으니 "이전까지" 몇 명이었는지는 하나를 뺀다. */
    private fun inviterRewarded(invite: InviteCode): Boolean =
        invite.kind == InviteCode.Kind.SPECIAL ||
            ReferralPolicy.inviterRewarded(referralRepository.countByInviterAndCode(invite.accountId, invite.code) - 1)

    /**
     * 운영자용 — 특별 초대 코드 발급. [ownerAccountId]가 "초대한 사람"으로 기록되고 [inviterReward]를 받는다.
     * 코드가 이미 있으면 예외 — 조용히 덮어쓰면 보상이 바뀐 줄 모른다.
     */
    @Transactional
    fun issueSpecialCode(ownerAccountId: UUID, rawCode: String, inviteeReward: Int, inviterReward: Int, maxUses: Int?): InviteCode {
        val code = InviteCode.special(ownerAccountId, rawCode, inviteeReward, inviterReward, maxUses)
        if (!inviteCodeRepository.saveIfCodeFree(code)) throw DailyMeetException("이미 있는 초대 코드예요")
        return code
    }

    private fun issueCode(accountId: UUID): InviteCode {
        repeat(MAX_ISSUE_ATTEMPTS) {
            val candidate = InviteCode.issue(accountId)
            if (inviteCodeRepository.saveIfCodeFree(candidate)) return candidate
            // 충돌이 아니라 같은 계정의 동시 요청이었을 수도 있다 — 그 사이 생겼으면 그걸 쓴다
            inviteCodeRepository.findByAccountId(accountId)?.let { return it }
        }
        throw DailyMeetException("초대 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요")
    }

    private companion object {
        const val MAX_ISSUE_ATTEMPTS = 5
    }
}

data class ReferralView(
    val code: String,
    val invitedCount: Int,
    val rewardInk: Int,
    val maxRewardedInvites: Int,
    val shareUrl: String,
    /** 내가 이미 누군가의 코드를 썼는지 — 썼으면 입력칸을 숨긴다. */
    val redeemed: Boolean,
)
