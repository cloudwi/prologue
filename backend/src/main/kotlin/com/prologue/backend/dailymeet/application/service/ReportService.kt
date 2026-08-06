package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Report
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.auth.application.service.AccountModerationService
import com.prologue.backend.dailymeet.domain.repository.ReportRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 어드민 검토용 신고 한 줄 — 닉네임은 탈퇴로 사라졌을 수 있어 null 허용. */
data class ReportView(
    val id: UUID,
    val reporterNickname: String?,
    val reportedNickname: String?,
    val context: String,
    val reason: String,
    val snapshot: String?,
    val createdAt: Instant,
    val status: String,
    val resolvedAt: Instant?,
)

/**
 * 신고 유스케이스 — 답변(프로필 포함)이나 편지를 검토 요청한다.
 * 대상 사용자는 서버가 식별자(답변/편지 id)로 판정한다 — 클라이언트가 계정 id를 다루지 않게.
 */
@Service
class ReportService(
    private val answerRepository: AnswerRepository,
    private val mailRepository: MailRepository,
    private val reportRepository: ReportRepository,
    private val memberQueryService: MemberQueryService,
    private val accountModerationService: AccountModerationService,
) {
    /** 답변 id로 신고 — 프로필 상세(그 답변의 주인)를 신고하는 경로. */
    @Transactional
    fun reportAnswer(reporterId: UUID, peerAnswerId: UUID, reason: String) {
        val answer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("신고할 대상을 찾을 수 없어요")
        reportRepository.save(
            Report.file(reporterId, answer.accountId, Report.CONTEXT_ANSWER, reason, answer.content),
        )
    }

    /** 받은 편지 신고 — 내가 받은 편지만 신고할 수 있다. */
    @Transactional
    fun reportMail(reporterId: UUID, mailId: UUID, reason: String) {
        val mail = mailRepository.findById(mailId)
            ?: throw DailyMeetException("신고할 대상을 찾을 수 없어요")
        if (mail.recipientAccountId != reporterId) throw DailyMeetException("내가 받은 편지만 신고할 수 있어요")
        reportRepository.save(
            Report.file(reporterId, mail.senderAccountId, Report.CONTEXT_MAIL, reason, mail.content),
        )
    }

    /** 어드민 — 최근 신고 목록. */
    @Transactional(readOnly = true)
    fun recent(): List<ReportView> =
        reportRepository.findRecent(RECENT_LIMIT).map { r ->
            ReportView(
                id = requireNotNull(r.id),
                reporterNickname = memberQueryService.findProfile(r.reporterAccountId)?.nickname,
                reportedNickname = memberQueryService.findProfile(r.reportedAccountId)?.nickname,
                context = r.context,
                reason = r.reason,
                snapshot = r.snapshot,
                createdAt = r.createdAt,
                status = r.status,
                resolvedAt = r.resolvedAt,
            )
        }

    /** 어드민 — 기각(검토 결과 문제없음). */
    @Transactional
    fun dismiss(reportId: UUID) {
        val report = reportRepository.findById(reportId) ?: throw DailyMeetException("신고를 찾을 수 없어요")
        report.dismiss()
        reportRepository.save(report)
    }

    /** 어드민 — 피신고 계정을 정지하고 신고를 조치 완료로 닫는다. */
    @Transactional
    fun suspendReported(reportId: UUID) {
        val report = reportRepository.findById(reportId) ?: throw DailyMeetException("신고를 찾을 수 없어요")
        report.resolve() // 먼저 닫는다 — 이미 처리된 신고면 여기서 거부돼 정지가 중복 실행되지 않는다
        accountModerationService.suspend(report.reportedAccountId)
        reportRepository.save(report)
    }

    companion object {
        private const val RECENT_LIMIT = 100
    }
}
