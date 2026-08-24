package com.prologue.backend.member.application.service

import com.prologue.backend.dailymeet.application.service.MailService
import com.prologue.backend.member.application.port.PhotoStorage
import com.prologue.backend.member.domain.repository.MemberRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 회원 탈퇴 — 계정과 모든 흔적을 지운다(앱스토어 5.1.1 요건).
 * 여러 컨텍스트의 테이블을 건드리는 일회성 청소라, 리포지토리를 늘리는 대신
 * 네이티브 삭제문을 FK 의존 순서대로 실행한다. 사진 파일은 베스트 에포트로 지운다.
 */
@Service
class WithdrawService(
    private val memberRepository: MemberRepository,
    private val photoStorage: PhotoStorage,
    private val mailService: MailService,
) {
    @PersistenceContext
    private lateinit var em: EntityManager

    @Transactional
    fun withdraw(accountId: UUID) {
        // 스토리지의 프로필 사진부터 — DB가 지워지면 URL을 다시 알 수 없다. 실패해도 탈퇴는 진행.
        memberRepository.findByAccountId(accountId)?.photoUrls?.forEach { url ->
            runCatching { photoStorage.deleteProfilePhoto(url) }
        }

        // 아직 열지 않은 편지는 보낸 사람에게 절반을 돌려준다 — 지우기 전에 해야 한다.
        // 편지가 사라진 뒤에는 누가 무엇을 보냈는지 알 수 없어 환급할 대상을 찾지 못한다.
        mailService.refundPendingMailsTo(accountId)

        // 내 답변을 참조하는 공개 기록 → 내 활동 → 지갑 → 프로필 → 인증 부산물 → 계정 순.
        // 기기 토큰부터 — 남겨두면 탈퇴한 사람의 폰으로 알림이 계속 간다.
        exec("delete from device_tokens where account_id = :id", accountId)
        exec("delete from daily_reveals where viewer_account_id = :id or peer_answer_id in (select id from answers where account_id = :id)", accountId)
        exec("delete from hearts where from_account_id = :id or to_account_id = :id", accountId)
        // 열람권도 양방향으로 — 내가 산 것과 남이 나를 열어둔 것 모두. 남겨두면 탈퇴한 사람의 자리에
        // 열린 채로 기록이 남고, 같은 계정 id가 재사용될 일은 없어도 지워야 할 개인정보다.
        exec("delete from profile_unlocks where account_id = :id or peer_account_id = :id", accountId)
        exec("delete from mails where sender_account_id = :id or recipient_account_id = :id", accountId)
        exec("delete from profile_letters where account_id = :id", accountId)
        exec("delete from answers where account_id = :id", accountId)
        exec("delete from ink_ledger where account_id = :id", accountId)
        exec("delete from ink_event_submissions where account_id = :id", accountId)
        exec("delete from ink_wallets where account_id = :id", accountId)
        // 직장 인증은 지워야 이메일이 풀린다 — 한 이메일 = 한 계정이라, 남겨두면 탈퇴자의
        // 회사 메일이 영영 잠긴다. 차단 목록·설정도 개인정보라 함께 지운다.
        exec("delete from job_verifications where account_id = :id", accountId)
        exec("delete from phone_blocks where account_id = :id", accountId)
        exec("delete from block_settings where account_id = :id", accountId)
        exec("delete from members where account_id = :id", accountId)
        exec("delete from email_verification_codes where email = (select email from accounts where id = :id)", accountId)
        exec("delete from account_roles where account_id = :id", accountId)
        exec("delete from accounts where id = :id", accountId)
    }

    private fun exec(sql: String, accountId: UUID) {
        em.createNativeQuery(sql).setParameter("id", accountId).executeUpdate()
    }
}
