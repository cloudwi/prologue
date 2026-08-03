package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.StampEventSubmission
import com.prologue.backend.dailymeet.domain.repository.StampEventSubmissionRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 우표 이벤트 — 블로그 후기 링크를 제출하면 운영자가 검토 후 우표를 지급한다.
 * 제출은 검토 중 1건만(중복 방지), 승인 시 지급은 원장(reason=EVENT)에 남는다.
 */
@Service
class StampEventService(
    private val submissionRepository: StampEventSubmissionRepository,
    private val stampService: StampService,
    private val memberQueryService: MemberQueryService,
) {
    @Transactional
    fun submit(accountId: UUID, url: String): List<StampEventSubmission> {
        if (submissionRepository.existsPendingByAccountId(accountId)) {
            throw DailyMeetException("검토 중인 제출이 있어요. 결과를 기다려주세요.")
        }
        submissionRepository.save(StampEventSubmission.submit(accountId, url))
        return submissionRepository.findByAccountId(accountId)
    }

    @Transactional(readOnly = true)
    fun mySubmissions(accountId: UUID): List<StampEventSubmission> =
        submissionRepository.findByAccountId(accountId)

    /** 어드민 — 검토 대기 목록, 먼저 낸 사람부터. 닉네임을 붙여 누구인지 알아볼 수 있게. */
    @Transactional(readOnly = true)
    fun pending(): List<PendingSubmissionView> =
        submissionRepository.findPending().map { submission ->
            PendingSubmissionView(
                id = submission.id!!,
                nickname = memberQueryService.findProfile(submission.accountId)?.nickname,
                url = submission.url,
                createdAt = submission.createdAt,
            )
        }

    /** 어드민 — 승인. 우표 지급과 상태 전이가 한 트랜잭션이라 지급만 되고 기록이 안 남는 일은 없다. */
    @Transactional
    fun approve(submissionId: UUID, amount: Int) {
        val submission = submissionRepository.findById(submissionId)
            ?: throw DailyMeetException("제출을 찾을 수 없어요")
        submission.approve(amount)
        submissionRepository.save(submission)
        stampService.grantTo(submission.accountId, amount, StampService.REASON_EVENT)
    }

    /** 어드민 — 반려. 지급 없이 상태만 닫는다. */
    @Transactional
    fun reject(submissionId: UUID) {
        val submission = submissionRepository.findById(submissionId)
            ?: throw DailyMeetException("제출을 찾을 수 없어요")
        submission.reject()
        submissionRepository.save(submission)
    }
}

/** 어드민 검토 목록의 한 줄. */
data class PendingSubmissionView(
    val id: UUID,
    val nickname: String?,
    val url: String,
    val createdAt: java.time.Instant,
)
