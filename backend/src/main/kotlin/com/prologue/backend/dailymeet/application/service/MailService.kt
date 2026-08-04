package com.prologue.backend.dailymeet.application.service

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Mail
import com.prologue.backend.dailymeet.domain.model.MailStatus
import com.prologue.backend.dailymeet.domain.repository.AnswerRepository
import com.prologue.backend.dailymeet.domain.repository.MailRepository
import com.prologue.backend.member.application.service.MemberQueryService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class SendMailResult(
    val mailId: UUID,
)

/** 내가 보낸 편지 한 통 — 부친 뒤에는 고칠 수 없는 기록이라 읽기 전용이다. */
data class SentMailView(
    val mailId: UUID,
    val recipientNickname: String?,
    val content: String,
    val phone: String?,
    val kakaoId: String?,
    val createdAt: Instant,
)

/**
 * 받은 편지 한 통 — 봉투(PENDING) 상태에서는 보낸 사람 요약만 보이고
 * 내용·연락처는 null. 열어야(OPENED) 채워진다.
 */
data class ReceivedMailView(
    val mailId: UUID,
    val nickname: String,
    val age: Int,
    val region: String,
    val avatarId: Int?,
    val photoUrl: String?,
    val status: MailStatus,
    val content: String?,
    val phone: String?,
    val kakaoId: String?,
    /** 보낸 사람의 최근 답변 id — 프로필 상세로 들어가는 손잡이. 답이 없으면 null(진입 불가). */
    val peerAnswerId: UUID?,
    /** 내가 이 사람에게 이미 편지를 보냈는지 — true면 답장 대신 보낸 편지 확인. */
    val replied: Boolean,
    val createdAt: Instant,
)

/**
 * 편지 유스케이스 — 인앱 채팅 대신 연락처(전화번호/카카오톡 ID)를 건넨다.
 * 한 통에 우표 1장 — 상호 하트여도 마찬가지(하트는 신호일 뿐, 부치는 값은 같다).
 * 전화번호는 위조를 막기 위해 요청이 아니라 프로필에서 읽는다.
 */
@Service
class MailService(
    private val answerRepository: AnswerRepository,
    private val mailRepository: MailRepository,
    private val memberQueryService: MemberQueryService,
    private val stampService: StampService,
) {
    /** 상대 답변(peerAnswerId)의 주인에게 편지를 보낸다. */
    @Transactional
    fun send(
        senderAccountId: UUID,
        peerAnswerId: UUID,
        content: String,
        includePhone: Boolean,
        kakaoId: String?,
    ): SendMailResult {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        return sendTo(senderAccountId, peerAnswer.accountId, content, includePhone, kakaoId)
    }

    /** 받은 편지에 답장한다 — 상대는 원본 편지의 발신인. 답장도 한 통의 편지라 값은 같다. */
    @Transactional
    fun reply(
        accountId: UUID,
        mailId: UUID,
        content: String,
        includePhone: Boolean,
        kakaoId: String?,
    ): SendMailResult {
        val original = mailRepository.findById(mailId)
            ?: throw DailyMeetException("편지를 찾을 수 없어요")
        if (original.recipientAccountId != accountId) throw DailyMeetException("내가 받은 편지에만 답장할 수 있어요")
        return sendTo(accountId, original.senderAccountId, content, includePhone, kakaoId)
    }

    private fun sendTo(
        senderAccountId: UUID,
        recipientId: UUID,
        content: String,
        includePhone: Boolean,
        kakaoId: String?,
    ): SendMailResult {
        if (senderAccountId == recipientId) throw DailyMeetException("자신에게는 편지를 보낼 수 없어요")
        if (mailRepository.existsBySenderAndRecipient(senderAccountId, recipientId)) {
            throw DailyMeetException("이미 편지를 보낸 상대예요")
        }

        val phone = if (includePhone) {
            memberQueryService.findProfile(senderAccountId)?.phone
                ?: throw DailyMeetException("프로필에 전화번호가 없어요. 기본 정보에서 먼저 등록해주세요")
        } else {
            null
        }

        // 검증을 모두 통과한 뒤에 소모 — 같은 트랜잭션이라 저장이 실패하면 우표도 돌아간다.
        stampService.spendOne(senderAccountId, StampService.REASON_MAIL)

        val saved = mailRepository.save(
            Mail.write(senderAccountId, recipientId, content, phone, kakaoId),
        )
        return SendMailResult(mailId = requireNotNull(saved.id))
    }

    /** 받은 편지 목록, 최신순. 봉투는 요약만, 열린 편지는 내용·연락처까지. 거절한 편지는 아예 없다. */
    @Transactional(readOnly = true)
    fun received(accountId: UUID): List<ReceivedMailView> =
        mailRepository.findAllByRecipient(accountId).mapNotNull { mail -> receivedView(accountId, mail) }

    /** 봉투를 연다 — 열린 편지 뷰를 돌려준다(멱등). */
    @Transactional
    fun open(accountId: UUID, mailId: UUID): ReceivedMailView {
        val mail = mailRepository.findById(mailId) ?: throw DailyMeetException("편지를 찾을 수 없어요")
        if (mail.recipientAccountId != accountId) throw DailyMeetException("내가 받은 편지만 열 수 있어요")
        mail.open()
        val saved = mailRepository.save(mail)
        return receivedView(accountId, saved) ?: throw DailyMeetException("보낸 사람의 프로필을 찾을 수 없어요")
    }

    /** 조용히 거절한다 — 목록에서 사라지고, 보낸 사람에게는 알리지 않는다. */
    @Transactional
    fun decline(accountId: UUID, mailId: UUID) {
        val mail = mailRepository.findById(mailId) ?: throw DailyMeetException("편지를 찾을 수 없어요")
        if (mail.recipientAccountId != accountId) throw DailyMeetException("내가 받은 편지만 거절할 수 있어요")
        mail.decline()
        mailRepository.save(mail)
    }

    private fun receivedView(accountId: UUID, mail: Mail): ReceivedMailView? {
        val sender = memberQueryService.findProfile(mail.senderAccountId) ?: return null
        val opened = mail.status == MailStatus.OPENED
        return ReceivedMailView(
            mailId = requireNotNull(mail.id),
            nickname = sender.nickname,
            age = sender.age(),
            region = sender.region,
            avatarId = sender.avatarId,
            photoUrl = sender.photoUrls.firstOrNull(),
            status = mail.status,
            // 봉투 상태에서는 내용과 연락처를 감춘다 — 여는 선택이 의미를 가지려면.
            content = if (opened) mail.content else null,
            phone = if (opened) mail.phone else null,
            kakaoId = if (opened) mail.kakaoId else null,
            peerAnswerId = answerRepository.findAllByAccountId(mail.senderAccountId).firstOrNull()?.id,
            replied = mailRepository.existsBySenderAndRecipient(accountId, mail.senderAccountId),
            createdAt = mail.createdAt,
        )
    }

    /** 내가 이 상대(답변 주인)에게 보낸 편지 — 없으면 null. */
    @Transactional(readOnly = true)
    fun sentTo(accountId: UUID, peerAnswerId: UUID): SentMailView? {
        val peerAnswer = answerRepository.findById(peerAnswerId)
            ?: throw DailyMeetException("상대의 답변을 찾을 수 없어요")
        val mail = mailRepository.findBySenderAndRecipient(accountId, peerAnswer.accountId) ?: return null
        return SentMailView(
            mailId = requireNotNull(mail.id),
            recipientNickname = memberQueryService.findProfile(mail.recipientAccountId)?.nickname,
            content = mail.content,
            phone = mail.phone,
            kakaoId = mail.kakaoId,
            createdAt = mail.createdAt,
        )
    }
}
